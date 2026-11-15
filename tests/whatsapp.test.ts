import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  normalizePhone,
  verifyWebhookSignature,
  renderTemplate,
  permitsNotification,
  canRetry,
  createWahaClient,
} from "../lib/server/whatsapp";

test("international phone numbers normalize without inferring a country", () => {
  assert.equal(normalizePhone("+965 5555-1234"), "96555551234");
  assert.equal(normalizePhone("00965 5555 1234"), "96555551234");
  for (const phone of [
    "55551234",
    "test@c.us",
    "+0123456789",
    "96555551234@g.us",
    "1234567890123456",
  ])
    assert.throws(() => normalizePhone(phone));
});

test("SHA512 verifies exact raw bytes and rejects malformed signatures safely", () => {
  const body = '{"event":"message.ack"}';
  const signature = createHmac("sha512", "secret").update(body).digest("hex");
  assert.equal(
    verifyWebhookSignature(body, signature, "sha512", "secret"),
    true,
  );
  for (const sig of [null, "x", "0".repeat(127), "g".repeat(128)])
    assert.equal(verifyWebhookSignature(body, sig, "sha512", "secret"), false);
  assert.equal(
    verifyWebhookSignature(body + " ", signature, "sha512", "secret"),
    false,
  );
  assert.equal(
    verifyWebhookSignature(body, signature, "sha256", "secret"),
    false,
  );
  assert.equal(verifyWebhookSignature(body, signature, "sha512", ""), false);
});

test("templates only interpolate explicitly approved minimal context", () => {
  assert.equal(
    renderTemplate("مرحباً {client_name}: {project_code} — {event}", {
      client_name: "محمد",
      project_code: "M-12",
      event: "تحديث المشروع",
    }),
    "مرحباً محمد: M-12 — تحديث المشروع",
  );
  assert.throws(() =>
    renderTemplate("{balance}", {
      client_name: "x",
      project_code: "x",
      event: "x",
    }),
  );
  assert.throws(() =>
    renderTemplate("x".repeat(2001), {
      client_name: "x",
      project_code: "x",
      event: "x",
    }),
  );
});

test("dispatch privacy fails closed for hidden project, event and client preferences", () => {
  const context = {
    globalEnabled: true,
    globalEvents: {},
    clientEnabled: true,
    clientEvents: {},
    visibility: { status: true, payments: true },
  };
  assert.equal(permitsNotification("payment_recorded", context), true);
  assert.equal(
    permitsNotification("payment_recorded", {
      ...context,
      visibility: { status: true },
    }),
    false,
  );
  assert.equal(
    permitsNotification("stage_changed", { ...context, globalEnabled: false }),
    false,
  );
  assert.equal(
    permitsNotification("stage_changed", { ...context, clientEnabled: false }),
    false,
  );
  assert.equal(
    permitsNotification("stage_changed", {
      ...context,
      clientEvents: { stage_changed: false },
    }),
    false,
  );
  assert.equal(
    permitsNotification("stage_changed", {
      ...context,
      globalEvents: { stage_changed: false },
    }),
    false,
  );
  assert.equal(
    permitsNotification("stage_changed", { ...context, visibility: {} }),
    false,
  );
  assert.equal(permitsNotification("unknown", context), false);
  assert.equal(permitsNotification("document_uploaded", context), false);
  assert.equal(
    permitsNotification("document_uploaded", {
      ...context,
      documentCategory: "architecture",
      visibility: { status: true, architecture: true },
    }),
    true,
  );
  assert.equal(
    permitsNotification("document_uploaded", {
      ...context,
      documentCategory: "receipts",
      visibility: { status: true, architecture: true },
    }),
    false,
  );
});

test("manual retry is limited to definite rejection", () => {
  assert.equal(canRetry("failed"), true);
  for (const status of [
    "sending",
    "uncertain",
    "sent",
    "delivered",
    "read",
    "cancelled",
    "queued",
  ])
    assert.equal(canRetry(status), false);
});

test("fake provider sends minimal text and exposes no credentials", async () => {
  let count = 0;
  const client = createWahaClient(
    { url: "http://127.0.0.1:3999", key: "private-key", session: "default" },
    async (input, init) => {
      count++;
      assert.equal(String(input), "http://127.0.0.1:3999/api/sendText");
      assert.equal(new Headers(init?.headers).get("X-Api-Key"), "private-key");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        session: "default",
        chatId: "96555551234@c.us",
        text: "safe message",
        linkPreview: false,
      });
      return new Response(JSON.stringify({ id: "provider-1" }), {
        status: 200,
      });
    },
  );
  assert.deepEqual(await client.sendText("+96555551234", "safe message"), {
    kind: "sent",
    messageId: "provider-1",
  });
  assert.equal(count, 1);
});

test("timeouts and ambiguous provider responses are never automatically retryable", async () => {
  const config = {
    url: "http://127.0.0.1:3999",
    key: "secret",
    session: "default",
  };
  for (const status of [408, 500, 502]) {
    const client = createWahaClient(
      config,
      async () => new Response("private provider details", { status }),
    );
    assert.deepEqual(await client.sendText("96555551234", "x"), {
      kind: "uncertain",
      error: "delivery_uncertain",
    });
  }
  const timeout = createWahaClient(config, async () => {
    throw new DOMException("secret URL timeout", "TimeoutError");
  });
  assert.deepEqual(await timeout.sendText("96555551234", "x"), {
    kind: "uncertain",
    error: "delivery_uncertain",
  });
  const rejected = createWahaClient(
    config,
    async () => new Response("private details", { status: 422 }),
  );
  assert.deepEqual(await rejected.sendText("96555551234", "x"), {
    kind: "failed",
    error: "provider_rejected",
  });
  const limited = createWahaClient(
    config,
    async () => new Response("", { status: 429 }),
  );
  assert.deepEqual(await limited.sendText("96555551234", "x"), {
    kind: "failed",
    error: "rate_limited",
  });
});
