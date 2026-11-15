import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { POST as webhook } from "../app/api/webhooks/waha/route";
import { GET as cron } from "../app/api/cron/notifications/route";

test("webhook rejects malformed signatures, wrong sessions and unsigned raw-body changes before persistence", async () => {
  const original = process.env.WAHA_WEBHOOK_SECRET,
    session = process.env.WAHA_SESSION;
  process.env.WAHA_WEBHOOK_SECRET = "test-secret";
  process.env.WAHA_SESSION = "default";
  const body = JSON.stringify({
    id: "event-test",
    event: "message.ack",
    session: "wrong-session",
    timestamp: Date.now(),
    payload: { id: "provider-id", ack: 3 },
  });
  const signature = createHmac("sha512", "test-secret")
    .update(body)
    .digest("hex");
  const request = (raw: string, sig: string) =>
    new Request("http://localhost/api/webhooks/waha", {
      method: "POST",
      headers: { "x-webhook-hmac": sig, "x-webhook-hmac-algorithm": "sha512" },
      body: raw,
    });
  try {
    assert.equal((await webhook(request(body, "bad-length"))).status, 401);
    assert.equal((await webhook(request(body, signature))).status, 400);
    assert.equal((await webhook(request(body + " ", signature))).status, 401);
    delete process.env.WAHA_WEBHOOK_SECRET;
    assert.equal((await webhook(request(body, signature))).status, 503);
  } finally {
    if (original === undefined) delete process.env.WAHA_WEBHOOK_SECRET;
    else process.env.WAHA_WEBHOOK_SECRET = original;
    if (session === undefined) delete process.env.WAHA_SESSION;
    else process.env.WAHA_SESSION = session;
  }
});

test("cron rejects absent/malformed secrets without touching queue", async () => {
  const original = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal(
      (await cron(new Request("http://localhost/api/cron/notifications")))
        .status,
      401,
    );
    process.env.CRON_SECRET = "long-secret";
    assert.equal(
      (
        await cron(
          new Request("http://localhost/api/cron/notifications", {
            headers: { authorization: "Bearer short" },
          }),
        )
      ).status,
      401,
    );
  } finally {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  }
});
