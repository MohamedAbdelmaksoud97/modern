import { pool } from "@/lib/server/db";
import { connection } from "next/server";
export async function GET() {
  await connection();
  try {
    await pool.query("SELECT 1");
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
