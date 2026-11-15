import { z } from "zod";
import {
  createSession,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/server/auth";
import { pool } from "@/lib/server/db";
import { apiError, assertSameOrigin, rateLimit } from "@/lib/server/http";
import { AppError } from "@/lib/server/rules";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await rateLimit("password:" + user.id, 10, 900);
    const input = z
      .object({
        current_password: z.string().max(128),
        new_password: z.string().min(12).max(128),
      })
      .parse(await request.json());
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query(
        "SELECT password_hash FROM modern.users WHERE id=$1 FOR UPDATE",
        [user.id],
      );
      if (
        !(await verifyPassword(
          input.current_password,
          current.rows[0].password_hash,
        ))
      )
        throw new AppError("كلمة المرور الحالية غير صحيحة", 400);
      if (input.current_password === input.new_password)
        throw new AppError("اختر كلمة مرور جديدة");
      const hash = await hashPassword(input.new_password);
      await client.query(
        "UPDATE modern.users SET password_hash=$1,must_change_password=false WHERE id=$2",
        [hash, user.id],
      );
      await client.query("DELETE FROM modern.sessions WHERE user_id=$1", [
        user.id,
      ]);
      await client.query(
        "INSERT INTO modern.audit(actor_id,actor_name,action) VALUES($1,$2,'password_changed')",
        [user.id, user.name],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await createSession(user.id);
    return Response.json({
      ok: true,
      redirect: user.role === "client" ? "/portal" : "/workspace",
    });
  } catch (e) {
    return apiError(e);
  }
}
