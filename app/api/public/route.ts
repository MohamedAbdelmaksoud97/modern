import { pool } from "@/lib/server/db";
import { apiError } from "@/lib/server/http";
import { connection } from "next/server";
export async function GET() {
  await connection();
  try {
    const result = await pool.query(
      "SELECT id,title,category,location,description,image_url,created_at FROM modern.portfolio WHERE published ORDER BY created_at DESC",
    );
    return Response.json({ portfolio: result.rows });
  } catch (e) {
    return apiError(e);
  }
}
