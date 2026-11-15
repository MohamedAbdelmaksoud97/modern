import { z } from "zod";
import { pool } from "@/lib/server/db";
import { createSession, verifyPassword } from "@/lib/server/auth";
import {
  apiError,
  assertSameOrigin,
  rateLimit,
  requestIp,
} from "@/lib/server/http";
import { AppError } from "@/lib/server/rules";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = z
      .object({
        identifier: z.string().trim().min(1).max(254),
        password: z.string().min(1).max(128),
      })
      .parse(await request.json());
    await rateLimit("login:" + requestIp(request), 30, 900);
    await rateLimit("login-user:" + input.identifier.toLowerCase(), 10, 900);
    const { rows } = await pool.query(
      "SELECT * FROM modern.users WHERE lower(email)=lower($1)",
      [input.identifier],
    );
    const user = rows[0];
    const valid = await verifyPassword(
      input.password,
      user?.password_hash ??
        "scrypt$00000000000000000000000000000000$" + "00".repeat(64),
    );
    if (!user?.active || !valid)
      throw new AppError("بيانات الدخول غير صحيحة", 401);
    await createSession(user.id);
    return Response.json({
      ok: true,
      redirect: user.must_change_password
        ? "/change-password"
        : user.role === "client"
          ? "/portal"
          : "/workspace",
    });
  } catch (e) {
    return apiError(e);
  }
}
