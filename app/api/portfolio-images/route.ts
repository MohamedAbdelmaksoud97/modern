import { requireUser } from "@/lib/server/auth";
import { withActor } from "@/lib/server/db";
import { audit } from "@/lib/server/business";
import { apiError, assertSameOrigin, rateLimit } from "@/lib/server/http";
import { AppError } from "@/lib/server/rules";
import { imageMime } from "@/lib/server/uploads";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    if (user.role !== "manager")
      throw new AppError("هذا الإجراء للمدير فقط", 403);
    await rateLimit("portfolio-image:" + user.id, 30, 3600);
    if (Number(request.headers.get("content-length") ?? 0) > 10 * 1024 * 1024)
      throw new AppError("حجم الصورة الأقصى 5 ميجابايت", 413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024)
      throw new AppError("اختر صورة حتى 5 ميجابايت");
    const bytes = Buffer.from(await file.arrayBuffer());
    const name = file.name.replace(/[\x00-\x1f\\/]/g, "_").slice(0, 200);
    const mime = imageMime(bytes, name);
    if (file.type && file.type !== mime)
      throw new AppError("نوع الصورة لا يطابق محتواها");
    const id = await withActor(user, async (c) => {
      const result = (
        await c.query(
          "INSERT INTO modern.portfolio_images(name,mime_type,size,content,uploaded_by) VALUES($1,$2,$3,$4,$5) RETURNING id",
          [name, mime, file.size, bytes, user.id],
        )
      ).rows[0];
      await audit(c, user, "portfolio_image_uploaded", null, {
        image_id: result.id,
        name,
      });
      return result.id;
    });
    return Response.json({ ok: true, url: "/api/portfolio-images/" + id });
  } catch (e) {
    return apiError(e);
  }
}
