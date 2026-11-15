import { z } from "zod";
import { pool } from "@/lib/server/db";
import {
  apiError,
  assertSameOrigin,
  rateLimit,
  requestIp,
} from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await rateLimit("inquiry:" + requestIp(request), 5, 3600);
    const p = z
      .object({
        name: z.string().trim().min(2).max(200),
        phone: z.string().trim().min(6).max(30),
        service: z.string().min(1).max(200),
        message: z.string().trim().min(5).max(5000),
        website: z.string().optional(),
      })
      .parse(await request.json());
    if (p.website) return Response.json({ ok: true });
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const result = await c.query(
        "INSERT INTO modern.inquiries(name,phone,service,message) VALUES($1,$2,$3,$4) RETURNING id",
        [p.name, p.phone, p.service, p.message],
      );
      await c.query(
        "INSERT INTO modern.audit(actor_name,action,details) VALUES('الموقع العام','inquiry_received',$1)",
        [JSON.stringify({ inquiry_id: result.rows[0].id })],
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
