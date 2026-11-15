import { getUser } from "@/lib/server/auth";
import { apiError, assertSameOrigin, rateLimit } from "@/lib/server/http";
import {
  createWahaClient,
  dispatchNotifications,
  getSettings,
  providerConfig,
  retryNotification,
  savePreference,
  saveSettings,
  validateEvents,
} from "@/lib/server/whatsapp";
import { AppError } from "@/lib/server/rules";
import { connection } from "next/server";
import { withActor } from "@/lib/server/db";

export const maxDuration = 120;
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function manager() {
  const user = await getUser();
  if (!user) throw new AppError("يرجى تسجيل الدخول", 401);
  if (user.role !== "manager" || user.must_change_password || !user.active)
    throw new AppError("غير مصرح", 403);
  return user;
}

export async function GET() {
  await connection();
  try {
    const user = await manager();
    await rateLimit(`waha:get:${user.id}`, 60, 60);
    const settings = await getSettings(user),
      config = providerConfig();
    return Response.json(
      {
        configured: !!config,
        status: config
          ? await createWahaClient(config).status()
          : "not_configured",
        ...settings,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await manager();
    await rateLimit(`waha:write:${user.id}`, 20, 60);
    if (Number(request.headers.get("content-length") ?? 0) > 20000)
      throw new AppError("الطلب كبير جداً", 413);
    const raw = await request.text();
    if (raw.length > 20000) throw new AppError("الطلب كبير جداً", 413);
    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      throw new AppError("طلب غير صالح", 400);
    }
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new AppError("طلب غير صالح", 400);
    if (input.action === "save_settings") {
      await saveSettings(user, input);
      return Response.json({ ok: true });
    }
    if (input.action === "save_preference") {
      if (
        typeof input.client_id !== "string" ||
        !uuid.test(input.client_id) ||
        typeof input.enabled !== "boolean"
      )
        throw new AppError("بيانات غير صالحة", 400);
      await savePreference(
        user,
        input.client_id,
        input.enabled,
        validateEvents(input.events),
      );
      return Response.json({ ok: true });
    }
    if (input.action === "retry") {
      if (typeof input.id !== "string" || !uuid.test(input.id))
        throw new AppError("معرف غير صالح", 400);
      if (!(await retryNotification(user, input.id)))
        throw new AppError("لا يمكن إعادة إرسال رسالة ناجحة أو غير مؤكدة", 409);
      return Response.json({ ok: true });
    }
    if (input.action === "dispatch")
      return Response.json({
        ok: true,
        ...(await withActor(user, () => dispatchNotifications())),
      });
    if (!["start", "restart", "qr"].includes(input.action))
      throw new AppError("إجراء غير صالح", 400);
    await rateLimit(`waha:session:${user.id}`, 6, 60);
    const config = providerConfig();
    if (!config) throw new AppError("خدمة واتساب غير مهيأة", 503);
    const provider = createWahaClient(config);
    try {
      if (input.action === "qr")
        return Response.json(
          { ok: true, qr: await withActor(user, () => provider.qr()) },
          { headers: { "Cache-Control": "no-store" } },
        );
      return Response.json({
        ok: true,
        status: await withActor(user, () =>
          provider.sessionAction(input.action),
        ),
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "تعذر الاتصال بخدمة واتساب أو الحصول على رمز الربط",
        502,
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      ["invalid_settings", "invalid_events", "invalid_template"].includes(
        error.message,
      )
    )
      return Response.json(
        { ok: false, error: "إعدادات أو متغيرات القالب غير صالحة" },
        { status: 400 },
      );
    return apiError(error);
  }
}
