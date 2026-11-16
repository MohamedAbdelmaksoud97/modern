import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import type { User, Visibility } from "../types";

export const notificationEvents = [
  "project_created",
  "stage_changed",
  "document_uploaded",
  "payment_recorded",
  "municipality_decision",
  "supervision_report",
  "project_completed",
] as const;
type NotificationEvent = (typeof notificationEvents)[number];
export const eventLabels: Record<NotificationEvent, string> = {
  project_created: "تسجيل مشروع",
  stage_changed: "تحديث مرحلة المشروع",
  document_uploaded: "إضافة ملف للمشروع",
  payment_recorded: "تسجيل دفعة",
  municipality_decision: "تحديث البلدية",
  supervision_report: "إضافة تقرير إشراف",
  project_completed: "اكتمال المشروع",
};
export const defaultTemplates = Object.fromEntries(
  notificationEvents.map((event) => [
    event,
    `مرحباً {client_name}، ${eventLabels[event]} للمشروع {project_code}. يرجى مراجعة بوابة العميل.`,
  ]),
) as Record<NotificationEvent, string>;
export type Settings = {
  enabled: boolean;
  events: Record<string, boolean>;
  templates: Record<string, string>;
};
type ProviderConfig = { url: string; key: string; session: string };
type SendResult =
  | { kind: "sent"; messageId: string }
  | { kind: "failed" | "uncertain"; error: string };
const documentVisibility = [
  "architecture",
  "civil",
  "drawings_2d",
  "drawings_3d",
  "municipality",
  "site_photos",
  "site_reports",
  "contract",
  "supervision_contract",
  "municipality_letters",
  "receipts",
] as const;
function isDocumentCategory(
  category: unknown,
): category is (typeof documentVisibility)[number] {
  return documentVisibility.some((allowed) => allowed === category);
}

export function normalizePhone(value: string): string {
  if (!/^(?:\+|00)?[1-9][\d\s().-]+$/.test(value))
    throw new Error("invalid_phone");
  const phone = value.replace(/[\s().-]/g, "").replace(/^(?:\+|00)/, "");
  if (!/^[1-9]\d{8,14}$/.test(phone)) throw new Error("invalid_phone");
  return phone;
}

export function safeSecretEqual(
  actual: string | null,
  expected: string,
): boolean {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyWebhookSignature(
  raw: string,
  signature: string | null,
  algorithm: string | null,
  secret: string,
): boolean {
  if (
    !secret ||
    algorithm !== "sha512" ||
    !signature ||
    !/^[a-fA-F0-9]{128}$/.test(signature)
  )
    return false;
  return timingSafeEqual(
    createHmac("sha512", secret).update(raw).digest(),
    Buffer.from(signature, "hex"),
  );
}

export function renderTemplate(
  template: string,
  context: { client_name: string; project_code: string; event: string },
): string {
  if (
    !template.trim() ||
    template.length > 2000 ||
    /[{}]/.test(template.replace(/\{(?:client_name|project_code|event)\}/g, ""))
  )
    throw new Error("invalid_template");
  return template.replace(
    /\{(client_name|project_code|event)\}/g,
    (_, key: keyof typeof context) =>
      context[key].replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 150),
  );
}

export function permitsNotification(
  event: string,
  context: {
    globalEnabled: boolean;
    globalEvents: Record<string, boolean>;
    clientEnabled: boolean;
    clientEvents: Record<string, boolean>;
    visibility: Visibility;
    documentCategory?: unknown;
  },
): boolean {
  if (
    !notificationEvents.includes(event as NotificationEvent) ||
    !context.globalEnabled ||
    !context.clientEnabled ||
    context.globalEvents[event] === false ||
    context.clientEvents[event] === false ||
    context.visibility.status !== true
  )
    return false;
  if (event === "payment_recorded") return context.visibility.payments === true;
  if (event === "municipality_decision")
    return context.visibility.municipality === true;
  if (event === "supervision_report")
    return context.visibility.site_reports === true;
  if (event === "document_uploaded")
    return (
      isDocumentCategory(context.documentCategory) &&
      context.visibility[context.documentCategory] === true
    );
  return true;
}

export function canRetry(status: string): boolean {
  return status === "failed";
}

export function providerConfig(): ProviderConfig | null {
  const {
    WAHA_URL: url,
    WAHA_API_KEY: key,
    WAHA_SESSION: session = "default",
  } = process.env;
  if (!url || !key || !/^[\w-]{1,54}$/.test(session)) return null;
  try {
    const u = new URL(url);
    if (
      !["http:", "https:"].includes(u.protocol) ||
      u.username ||
      u.password ||
      u.search ||
      u.hash
    )
      return null;
  } catch {
    return null;
  }
  return { url: url.replace(/\/$/, ""), key, session };
}

export function createWahaClient(
  config: ProviderConfig,
  fetcher: typeof fetch = fetch,
) {
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<Response> {
    return fetcher(`${config.url}${path}`, {
      method,
      headers: {
        "X-Api-Key": config.key,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      redirect: "error",
    });
  }
  return {
    async status(): Promise<string> {
      try {
        const r = await request(
          `/api/sessions/${encodeURIComponent(config.session)}`,
        );
        if (r.status === 404) return "not_started";
        if (!r.ok) return "unavailable";
        const data = await r.json();
        return [
          "STOPPED",
          "STARTING",
          "SCAN_QR_CODE",
          "WORKING",
          "FAILED",
        ].includes(data.status)
          ? data.status
          : "unavailable";
      } catch {
        return "unavailable";
      }
    },
    async sessionAction(action: "start" | "restart"): Promise<string> {
      const status = action === "start" ? await this.status() : null;
      if (action === "start" && status === "not_started") {
        const r = await request("/api/sessions", "POST", {
          name: config.session,
          start: true,
        });
        if (!r.ok) throw new Error("provider_unavailable");
      } else {
        const r = await request(
          `/api/sessions/${encodeURIComponent(config.session)}/${
            action === "start" && status === "FAILED" ? "restart" : action
          }`,
          "POST",
        );
        if (!r.ok) throw new Error("provider_unavailable");
      }
      return this.status();
    },
    async qr(): Promise<string> {
      const r = await request(
        `/api/${encodeURIComponent(config.session)}/auth/qr`,
      );
      if (!r.ok) throw new Error("qr_unavailable");
      const d = await r.json();
      if (
        d.mimetype !== "image/png" ||
        typeof d.data !== "string" ||
        d.data.length > 1_000_000 ||
        !/^[A-Za-z0-9+/=]+$/.test(d.data)
      )
        throw new Error("qr_unavailable");
      return `data:image/png;base64,${d.data}`;
    },
    async sendText(phone: string, text: string): Promise<SendResult> {
      let chatId: string;
      try {
        chatId = `${normalizePhone(phone)}@c.us`;
      } catch {
        return { kind: "failed", error: "invalid_phone" };
      }
      try {
        const r = await request("/api/sendText", "POST", {
          session: config.session,
          chatId,
          text,
          linkPreview: false,
        });
        if ([400, 401, 403, 404, 405, 413, 415, 422, 429].includes(r.status))
          return {
            kind: "failed",
            error: r.status === 429 ? "rate_limited" : "provider_rejected",
          };
        if (!r.ok) return { kind: "uncertain", error: "delivery_uncertain" };
        const d = await r.json();
        if (typeof d.id !== "string" || !d.id || d.id.length > 500)
          return { kind: "uncertain", error: "delivery_uncertain" };
        return { kind: "sent", messageId: d.id };
      } catch {
        return { kind: "uncertain", error: "delivery_uncertain" };
      }
    },
  };
}

async function database() {
  return (await import("./db")).pool;
}
async function actorTransaction<T>(
  user: User,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return (await import("./db")).withActor(user, fn);
}

export async function getSettings(user?: User): Promise<Settings> {
  const read = async (client: Pick<PoolClient, "query">) => {
    const r = await client.query(
      "select enabled,events,templates from modern.notification_settings where id=true",
    );
    const row = r.rows[0];
    return {
      enabled: row?.enabled === true,
      events: Object.fromEntries(
        notificationEvents.map((e) => [e, row?.events?.[e] !== false]),
      ),
      templates: { ...defaultTemplates, ...row?.templates },
    };
  };
  return user ? actorTransaction(user, read) : read(await database());
}

export function validateEvents(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid_events");
  for (const [key, enabled] of Object.entries(value))
    if (
      !notificationEvents.includes(key as NotificationEvent) ||
      typeof enabled !== "boolean"
    )
      throw new Error("invalid_events");
  return value as Record<string, boolean>;
}

export async function saveSettings(
  user: User,
  input: { enabled: unknown; events: unknown; templates: unknown },
): Promise<void> {
  if (
    typeof input.enabled !== "boolean" ||
    !input.templates ||
    typeof input.templates !== "object" ||
    Array.isArray(input.templates)
  )
    throw new Error("invalid_settings");
  const events = validateEvents(input.events),
    templates: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.templates)) {
    if (
      !notificationEvents.includes(key as NotificationEvent) ||
      typeof value !== "string"
    )
      throw new Error("invalid_template");
    renderTemplate(value, {
      client_name: "عميل",
      project_code: "M",
      event: eventLabels[key as NotificationEvent],
    });
    templates[key] = value;
  }
  await actorTransaction(user, async (client) => {
    await client.query("select pg_advisory_xact_lock(664381251)");
    await client.query(
      "update modern.notification_settings set enabled=$1,events=$2,templates=$3 where id=true",
      [input.enabled, events, templates],
    );
  });
}

export async function savePreference(
  user: User,
  clientId: string,
  enabled: boolean,
  events: Record<string, boolean>,
): Promise<void> {
  await actorTransaction(user, async (client) => {
    await client.query("select pg_advisory_xact_lock(664381251)");
    await client.query(
      "insert into modern.notification_preferences(client_id,enabled,events) values($1,$2,$3) on conflict(client_id) do update set enabled=excluded.enabled,events=excluded.events",
      [clientId, enabled, events],
    );
  });
}

export async function retryNotification(
  user: User,
  id: string,
): Promise<boolean> {
  return actorTransaction(user, async (client) => {
    const result = await client.query(
      "update modern.notifications set status='queued',next_attempt_at=now(),last_error=null,lease_token=null,lease_until=null,updated_at=now() where id=$1 and status='failed' and provider_message_id is null returning id",
      [id],
    );
    return result.rowCount === 1;
  });
}

export async function dispatchNotifications(
  limit = 10,
  notificationIds?: string[],
): Promise<{ processed: number; status: string }> {
  const config = providerConfig();
  if (!config) return { processed: 0, status: "not_configured" };
  const provider = createWahaClient(config);
  if ((await provider.status()) !== "WORKING")
    return { processed: 0, status: "not_connected" };
  const pool = await database();
  let processed = 0;
  // A process could have died after WAHA accepted a request. An expired lease is ambiguous, never a retry.
  await pool.query(
    "update modern.notifications set status='uncertain',last_error='delivery_uncertain',lease_token=null,lease_until=null,updated_at=now() where status='sending' and lease_until<now() and ($1::uuid[] is null or id=any($1::uuid[]))",
    [notificationIds ?? null],
  );
  for (let i = 0; i < Math.min(10, Math.max(0, limit)); i++) {
    const token = randomUUID();
    const claim = await pool.query(
      "update modern.notifications set status='sending',lease_token=$1,lease_until=now()+interval '2 minutes',attempts=attempts+1,updated_at=now() where id=(select id from modern.notifications where (status in ('queued','pending') or (status='failed' and last_error='rate_limited' and attempts<5)) and next_attempt_at<=now() and ($2::uuid[] is null or id=any($2::uuid[])) order by next_attempt_at,created_at for update skip locked limit 1) returning id,project_id,client_id,event,attempts",
      [token, notificationIds ?? null],
    );
    if (!claim.rows.length) break;
    const job = claim.rows[0];
    const client = await pool.connect();
    try {
      await client.query("begin");
      // Settings/preference edits serialize with dispatch. Project share locks serialize visibility changes.
      await client.query("select pg_advisory_xact_lock(664381251)");
      const owned = await client.query(
        "select id from modern.notifications where id=$1 and lease_token=$2 and status='sending' and lease_until>now() for update",
        [job.id, token],
      );
      if (!owned.rowCount) {
        await client.query("rollback");
        continue;
      }
      const current = await client.query(
        "select p.code,p.visibility,c.name,c.phone from modern.projects p join modern.clients c on c.id=p.client_id where p.id=$1 and c.id=$2 for share of p,c",
        [job.project_id, job.client_id],
      );
      const settings = await client.query(
        "select enabled,events,templates from modern.notification_settings where id=true for share",
      );
      const preference = await client.query(
        "select enabled,events from modern.notification_preferences where client_id=$1 for share",
        [job.client_id],
      );
      const documentCategory =
        job.event === "document_uploaded"
          ? (
              await client.query(
                `
          select a.details->>'category' as category
          from modern.notifications n join modern.audit a on a.id=
            case when n.dedup_key ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then n.dedup_key::uuid end
          where n.id=$1 and a.project_id=n.project_id and (
            a.action='document_uploaded' or (a.action='drawing_published' and exists (
              select 1 from modern.documents d join modern.drawing_series s on s.id=d.drawing_id
              where d.id=(a.details->>'document_id')::uuid and d.project_id=n.project_id
                and d.revision_number=s.published_revision
            ))
          )
        `,
                [job.id],
              )
            ).rows[0]?.category
          : undefined;
      const p = current.rows[0],
        s = settings.rows[0],
        pref = preference.rows[0];
      let result: SendResult | { kind: "cancelled"; error: string };
      let body = "";
      if (
        !p ||
        !permitsNotification(job.event, {
          globalEnabled: s?.enabled === true,
          globalEvents: s?.events ?? {},
          clientEnabled: pref?.enabled !== false,
          clientEvents: pref?.events ?? {},
          visibility: p.visibility ?? {},
          documentCategory,
        })
      )
        result = {
          kind: "cancelled",
          error: "suppressed_by_preferences_or_visibility",
        };
      else {
        try {
          body = renderTemplate(
            s?.templates?.[job.event] ??
              defaultTemplates[job.event as NotificationEvent],
            {
              client_name: p.name,
              project_code: p.code,
              event: eventLabels[job.event as NotificationEvent],
            },
          );
        } catch {
          result = { kind: "failed", error: "invalid_template" };
        }
        result ??= await provider.sendText(p.phone, body);
      }
      const delay = Math.min(3600, 30 * 2 ** Math.min(job.attempts, 7));
      let finalStatus: string = result.kind;
      if (result.kind === "sent") {
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [
          `waha-receipt:${result.messageId}`,
        ]);
        const receipt = await client.query(
          "select max(ack) as ack from modern.waha_webhook_events where provider_message_id=$1",
          [result.messageId],
        );
        if (receipt.rows[0]?.ack >= 3) finalStatus = "read";
        else if (receipt.rows[0]?.ack >= 2) finalStatus = "delivered";
      }
      await client.query(
        "update modern.notifications set status=$3,body=$4,last_error=$5,provider_message_id=$6,sent_at=case when $6::text is not null then now() else sent_at end,next_attempt_at=now()+($7*interval '1 second'),lease_token=null,lease_until=null,updated_at=now() where id=$1 and lease_token=$2 and status='sending'",
        [
          job.id,
          token,
          finalStatus,
          body,
          result.kind === "sent" ? null : result.error,
          result.kind === "sent" ? result.messageId : null,
          delay,
        ],
      );
      await client.query("commit");
      processed++;
    } catch {
      await client.query("rollback");
      // A DB failure after a successful HTTP call must never cause a duplicate send.
      await pool.query(
        "update modern.notifications set status='uncertain',last_error='delivery_uncertain',lease_token=null,lease_until=null,updated_at=now() where id=$1 and lease_token=$2 and status='sending'",
        [job.id, token],
      );
    } finally {
      client.release();
    }
  }
  return { processed, status: "ok" };
}

export type WahaEvent = {
  id: string;
  session: string;
  event: string;
  timestamp: number;
  payload: Record<string, unknown>;
};
export async function processWebhook(event: WahaEvent): Promise<boolean> {
  const pool = await database(),
    client = await pool.connect();
  try {
    await client.query("begin");
    const messageId =
      event.event === "message.ack" && typeof event.payload.id === "string"
        ? event.payload.id
        : null;
    const ack =
      event.event === "message.ack" && Number.isInteger(event.payload.ack)
        ? event.payload.ack
        : null;
    if (messageId)
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [
        `waha-receipt:${messageId}`,
      ]);
    const inserted = await client.query(
      "insert into modern.waha_webhook_events(id,provider_message_id,ack) values($1,$2,$3) on conflict do nothing returning id",
      [`${event.session}:${event.id}`, messageId, ack],
    );
    if (!inserted.rowCount) {
      await client.query("commit");
      return false;
    }
    if (
      event.event === "session.status" &&
      typeof event.payload.status === "string" &&
      ["STOPPED", "STARTING", "SCAN_QR_CODE", "WORKING", "FAILED"].includes(
        event.payload.status,
      )
    ) {
      await client.query(
        "insert into modern.waha_sessions(name,status,updated_at) values($1,$2,to_timestamp($3/1000.0)) on conflict(name) do update set status=excluded.status,updated_at=excluded.updated_at where modern.waha_sessions.updated_at<=excluded.updated_at",
        [event.session, event.payload.status, event.timestamp],
      );
    }
    if (
      event.event === "message.ack" &&
      typeof event.payload.id === "string" &&
      typeof event.payload.ack === "number"
    ) {
      const ack = event.payload.ack,
        status =
          ack >= 3 ? "read" : ack >= 2 ? "delivered" : ack >= 1 ? "sent" : null;
      if (status)
        await client.query(
          "update modern.notifications set status=$2,updated_at=now() where provider_message_id=$1 and status in ('sent','delivered','read') and case status when 'sent' then 1 when 'delivered' then 2 when 'read' then 3 else 0 end < $3",
          [event.payload.id, status, ack >= 3 ? 3 : ack >= 2 ? 2 : 1],
        );
    }
    await client.query("commit");
    return true;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
