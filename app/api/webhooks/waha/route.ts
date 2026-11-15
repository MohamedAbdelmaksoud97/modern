import {
  processWebhook,
  verifyWebhookSignature,
  type WahaEvent,
} from "@/lib/server/whatsapp";

export async function POST(request: Request) {
  const secret = process.env.WAHA_WEBHOOK_SECRET,
    session = process.env.WAHA_SESSION ?? "default";
  if (!secret) return Response.json({ ok: false }, { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > 100000)
    return Response.json({ ok: false }, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 100000)
    return Response.json({ ok: false }, { status: 413 });
  if (
    !verifyWebhookSignature(
      raw,
      request.headers.get("x-webhook-hmac"),
      request.headers.get("x-webhook-hmac-algorithm"),
      secret,
    )
  )
    return Response.json({ ok: false }, { status: 401 });
  let event: WahaEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  // Use the signed envelope ID/timestamp; delivery headers can change on each WAHA retry.
  if (
    !event ||
    event.session !== session ||
    typeof event.id !== "string" ||
    !event.id ||
    event.id.length > 200 ||
    !Number.isFinite(event.timestamp) ||
    event.timestamp > Date.now() + 300000 ||
    event.timestamp < Date.now() - 7 * 86400000 ||
    !event.payload ||
    typeof event.payload !== "object" ||
    Array.isArray(event.payload)
  )
    return Response.json({ ok: false }, { status: 400 });
  if (!["session.status", "message.ack"].includes(event.event))
    return Response.json({ ok: true });
  try {
    await processWebhook(event);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
