import { createHash } from "node:crypto";
import { ZodError } from "zod";
import { pool } from "./db";
import { AppError } from "./rules";
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const expected = process.env.APP_ORIGIN || url.protocol + "//" + host;
  if (
    (origin && origin !== expected) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new AppError("طلب غير مسموح", 403);
  }
}
export function apiError(error: unknown) {
  if (error instanceof AppError)
    return Response.json(
      {
        ok: false,
        error: error.message,
        code:
          error.code === "VALIDATION_ERROR"
            ? error.status === 401
              ? "UNAUTHENTICATED"
              : error.status === 403
                ? "FORBIDDEN"
                : error.status === 404
                  ? "NOT_FOUND"
                  : error.status === 409
                    ? "CONFLICT"
                    : error.status === 429
                      ? "RATE_LIMITED"
                      : error.code
            : error.code,
      },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return Response.json(
      {
        ok: false,
        error: "تحقق من الحقول المطلوبة وصيغتها",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  const code = (
    error as {
      code?: string;
    }
  )?.code;
  if (code === "23505")
    return Response.json(
      { ok: false, error: "السجل موجود بالفعل", code: "DUPLICATE" },
      { status: 409 },
    );
  if (["23503", "23514", "22P02", "22007", "22008"].includes(code ?? ""))
    return Response.json(
      {
        ok: false,
        error: "بيانات غير صالحة أو مرجع غير موجود",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  if (code === "42501")
    return Response.json(
      { ok: false, error: "ليس لديك صلاحية لهذا الإجراء", code: "FORBIDDEN" },
      { status: 403 },
    );
  console.error(
    "API failure",
    error instanceof Error ? error.message : "unknown",
  );
  return Response.json(
    {
      ok: false,
      error: "تعذر تنفيذ الطلب. يرجى المحاولة مجدداً",
      code: "SERVER_ERROR",
    },
    { status: 500 },
  );
}
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const hash = createHash("sha256").update(key).digest("hex");
  const { rows } = await pool.query(
    "INSERT INTO modern.rate_limits(key,count,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN modern.rate_limits.expires_at<now() THEN 1 ELSE modern.rate_limits.count+1 END,expires_at=CASE WHEN modern.rate_limits.expires_at<now() THEN EXCLUDED.expires_at ELSE modern.rate_limits.expires_at END RETURNING count",
    [hash, windowSeconds],
  );
  if (rows[0].count > limit)
    throw new AppError("طلبات كثيرة. يرجى المحاولة لاحقاً", 429);
}
export function requestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
  );
}
