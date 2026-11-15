import { z } from "zod";
import { getUser } from "@/lib/server/auth";
import { pool } from "@/lib/server/db";
import { apiError } from "@/lib/server/http";
import { AppError } from "@/lib/server/rules";
export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const user = await getUser();
    const manager =
      !!user && user.role === "manager" && !user.must_change_password;
    const image = (
      await pool.query(
        "SELECT i.content,i.mime_type,i.size FROM modern.portfolio_images i WHERE i.id=$1 AND ($2 OR EXISTS(SELECT 1 FROM modern.portfolio p WHERE p.published AND p.image_url='/api/portfolio-images/'||i.id::text))",
        [id, manager],
      )
    ).rows[0];
    if (!image) throw new AppError("الصورة غير موجودة", 404);
    return new Response(new Uint8Array(image.content), {
      headers: {
        "Content-Type": image.mime_type,
        "Content-Length": String(image.size),
        "Content-Disposition": "inline",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
