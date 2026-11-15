import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { loadEnvConfig } from "@next/env";
import { dispatchNotifications, processWebhook } from "../lib/server/whatsapp";

test(
  "durable outbox: concurrency, deduplication, live privacy, ambiguity, replay and monotonic ACK",
  { skip: process.env.WHATSAPP_DB_TEST !== "1" },
  async () => {
    loadEnvConfig(process.cwd());
    const { pool } = await import("../lib/server/db");
    const clientId = randomUUID(),
      projectId = randomUUID(),
      tag = randomUUID();
    const prior = {
      WAHA_URL: process.env.WAHA_URL,
      WAHA_API_KEY: process.env.WAHA_API_KEY,
      WAHA_SESSION: process.env.WAHA_SESSION,
    };
    const snapshot = (
      await pool.query(
        "select enabled,events,templates from modern.notification_settings where id=true",
      )
    ).rows[0];
    const jobs: string[] = [];
    let requests = 0;
    let mode: "ok" | "ambiguous" | "early_ack" = "ok";
    const server = createServer(async (req, res) => {
      if (req.method === "GET") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "WORKING" }));
        return;
      }
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      assert.equal(body.chatId, "96555551234@c.us");
      requests++;
      if (mode === "ambiguous") {
        res.writeHead(502);
        res.end("internal-sensitive-error");
        return;
      }
      const id = `fake-${tag}-${requests}`;
      if (mode === "early_ack")
        await processWebhook({
          id: `early-${id}`,
          event: "message.ack",
          session: "default",
          timestamp: Date.now(),
          payload: { id, ack: 3 },
        });
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ id }));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    process.env.WAHA_URL = `http://127.0.0.1:${address.port}`;
    process.env.WAHA_API_KEY = "fake-key";
    process.env.WAHA_SESSION = "default";
    async function enqueue(key: string = randomUUID()) {
      const id = randomUUID();
      const r = await pool.query(
        "insert into modern.notifications(id,project_id,client_id,event,dedup_key) values($1,$2,$3,'stage_changed',$4) on conflict(dedup_key) do nothing returning id",
        [id, projectId, clientId, `${tag}:${key}`],
      );
      if (r.rowCount) jobs.push(id);
      return r.rows[0]?.id as string | undefined;
    }
    async function status(id: string) {
      return (
        await pool.query(
          "select status,last_error,attempts,provider_message_id from modern.notifications where id=$1",
          [id],
        )
      ).rows[0];
    }
    try {
      await pool.query(
        "insert into modern.clients(id,name,national_id,phone) values($1,'WAHA TEST',$2,'96555551234')",
        [clientId, tag],
      );
      await pool.query(
        "insert into modern.projects(id,code,name,client_id,location,visibility) values($1,$2,'WAHA TEST',$3,'TEST',$4)",
        [projectId, `TEST-${tag}`, clientId, { status: true }],
      );
      await pool.query(
        "update modern.notification_settings set enabled=true,events='{}',templates='{}' where id=true",
      );
      const id = (await enqueue("business-key"))!;
      assert.equal(await enqueue("business-key"), undefined);
      await Promise.all([
        dispatchNotifications(1, [id]),
        dispatchNotifications(1, [id]),
      ]);
      assert.equal(requests, 1);
      assert.equal((await status(id)).status, "sent");
      await dispatchNotifications(1, [id]);
      assert.equal(requests, 1);
      const providerId = (await status(id)).provider_message_id;
      const ack = {
        id: `ack-${tag}`,
        session: "default",
        event: "message.ack",
        timestamp: Date.now(),
        payload: { id: providerId, ack: 3 },
      };
      assert.equal(await processWebhook(ack), true);
      assert.equal(await processWebhook(ack), false);
      await processWebhook({
        ...ack,
        id: `late-${tag}`,
        payload: { id: providerId, ack: 2 },
      });
      assert.equal((await status(id)).status, "read");
      const hidden = (await enqueue())!;
      await pool.query(
        "update modern.projects set visibility='{}' where id=$1",
        [projectId],
      );
      await dispatchNotifications(1, [hidden]);
      assert.equal((await status(hidden)).status, "cancelled");
      assert.equal(requests, 1);
      await pool.query("update modern.projects set visibility=$2 where id=$1", [
        projectId,
        { status: true },
      ]);
      const optedOut = (await enqueue())!;
      await pool.query(
        "insert into modern.notification_preferences(client_id,enabled) values($1,false)",
        [clientId],
      );
      await dispatchNotifications(1, [optedOut]);
      assert.equal((await status(optedOut)).status, "cancelled");
      assert.equal(requests, 1);
      await pool.query(
        "update modern.notification_preferences set enabled=true where client_id=$1",
        [clientId],
      );
      mode = "ambiguous";
      const uncertain = (await enqueue())!;
      await dispatchNotifications(1, [uncertain]);
      assert.equal((await status(uncertain)).status, "uncertain");
      await dispatchNotifications(1, [uncertain]);
      assert.equal(requests, 2);
      assert.equal((await status(uncertain)).last_error, "delivery_uncertain");
      mode = "early_ack";
      const early = (await enqueue())!;
      await dispatchNotifications(1, [early]);
      assert.equal((await status(early)).status, "read");
      const expired = (await enqueue())!;
      await pool.query(
        "update modern.notifications set status='sending',lease_token=$2,lease_until=now()-interval '1 minute' where id=$1",
        [expired, randomUUID()],
      );
      await dispatchNotifications(1, [expired]);
      assert.equal((await status(expired)).status, "uncertain");
      assert.equal(requests, 3);
    } finally {
      await pool.query(
        "delete from modern.waha_webhook_events where id like $1",
        [`%${tag}%`],
      );
      await pool.query(
        "delete from modern.notifications where id=any($1::uuid[])",
        [jobs],
      );
      await pool.query(
        "delete from modern.notification_preferences where client_id=$1",
        [clientId],
      );
      await pool.query("delete from modern.projects where id=$1", [projectId]);
      await pool.query("delete from modern.clients where id=$1", [clientId]);
      await pool.query(
        "update modern.notification_settings set enabled=$1,events=$2,templates=$3 where id=true",
        [snapshot.enabled, snapshot.events, snapshot.templates],
      );
      for (const [key, value] of Object.entries(prior))
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await pool.end();
    }
  },
);
