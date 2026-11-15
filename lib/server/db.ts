import { Pool, type PoolClient } from "pg";
import type { User } from "@/lib/types";
import { AppError } from "./rules";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const databaseUrl = process.env.SUPABASE_DB_URL
  ? new URL(process.env.SUPABASE_DB_URL)
  : null;
for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
  databaseUrl?.searchParams.delete(key);
const globalPool = globalThis as unknown as {
  modernPool?: Pool;
};
export const pool =
  globalPool.modernPool ??
  new Pool({
    connectionString: databaseUrl?.toString(),
    ssl: databaseUrl
      ? {
          rejectUnauthorized: true,
          ca:
            process.env.SUPABASE_DB_CA_PEM ??
            readFileSync(
              join(process.cwd(), "certs", "supabase-ca.crt"),
              "utf8",
            ),
        }
      : undefined,
    max: 8,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
if (process.env.NODE_ENV !== "production") globalPool.modernPool = pool;
export async function withActor<T>(
  user: User,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const fresh = await client.query(
      "SELECT active,must_change_password,role FROM modern.users WHERE id=$1 FOR SHARE",
      [user.id],
    );
    if (!fresh.rows[0]?.active)
      throw new AppError("يرجى تسجيل الدخول", 401, "UNAUTHENTICATED");
    if (fresh.rows[0].role !== user.role)
      throw new AppError(
        "تغيرت صلاحيات الحساب. يرجى تسجيل الدخول مجدداً",
        401,
        "UNAUTHENTICATED",
      );
    if (fresh.rows[0].must_change_password)
      throw new AppError(
        "يجب تغيير كلمة المرور أولاً",
        403,
        "PASSWORD_CHANGE_REQUIRED",
      );
    await client.query("SET LOCAL ROLE modern_app");
    await client.query(
      "SELECT set_config('modern.user_id',$1,true),set_config('statement_timeout','15000',true)",
      [user.id],
    );
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
