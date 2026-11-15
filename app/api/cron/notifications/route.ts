import { dispatchNotifications, safeSecretEqual } from "@/lib/server/whatsapp";
import { rateLimit } from "@/lib/server/http";

export const maxDuration = 120;
export async function GET(request: Request) {
  if (
    !safeSecretEqual(
      request.headers.get("authorization"),
      process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "",
    )
  )
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    await rateLimit("notifications:cron", 4, 60);
    return Response.json(
      { ok: true, ...(await dispatchNotifications()) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false, error: "dispatch_unavailable" },
      { status: 503 },
    );
  }
}
export const POST = GET;
