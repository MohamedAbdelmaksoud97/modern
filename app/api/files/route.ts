import { z } from "zod";
import { requireUser } from "@/lib/server/auth";
import { withActor } from "@/lib/server/db";
import { audit, notify } from "@/lib/server/business";
import { apiError, assertSameOrigin, rateLimit } from "@/lib/server/http";
import { AppError, categories, stageRoles } from "@/lib/server/rules";
const categoryStage: Record<string, number> = {
  contract: 0,
  architecture: 1,
  civil: 2,
  drawings_2d: 3,
  drawings_3d: 3,
  municipality: 4,
  municipality_letters: 5,
  supervision_contract: 6,
  site_photos: 7,
  site_reports: 7,
};
function inspectFile(bytes: Buffer, name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf" && bytes.subarray(0, 5).toString() === "%PDF-")
    return "application/pdf";
  if (
    ext === "png" &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    ["jpg", "jpeg"].includes(ext ?? "") &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "image/jpeg";
  if (
    ext === "webp" &&
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  if (ext === "dwg" && /^AC10\d\d$/.test(bytes.subarray(0, 6).toString()))
    return "application/acad";
  if (
    ext === "dxf" &&
    (/SECTION/.test(bytes.subarray(0, 1000).toString()) ||
      bytes.subarray(0, 18).toString() === "AutoCAD Binary DXF")
  )
    return "application/dxf";
  throw new AppError(
    "الملفات المسموحة: PDF وPNG وJPG وWEBP وDWG وDXF. يجب أن يطابق محتوى الملف امتداده",
  );
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    if (user.role === "client")
      throw new AppError("ليس لديك صلاحية الرفع", 403);
    await rateLimit("upload:" + user.id, 60, 3600);
    if (Number(request.headers.get("content-length") ?? 0) > 16 * 1024 * 1024)
      throw new AppError("حجم الملف الأقصى 15 ميجابايت", 413);
    const form = await request.formData();
    const projectId = z.string().uuid().parse(form.get("project_id"));
    const category = z.enum(categories).parse(form.get("category"));
    const reportId = z
      .string()
      .uuid()
      .nullable()
      .parse(form.get("report_id") || null);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 15 * 1024 * 1024)
      throw new AppError("اختر ملفاً حتى 15 ميجابايت");
    const bytes = Buffer.from(await file.arrayBuffer());
    const name = file.name.replace(/[\x00-\x1f\\/]/g, "_").slice(0, 200);
    const mime = inspectFile(bytes, name);
    if (
      file.type &&
      file.type !== "application/octet-stream" &&
      file.type !== mime &&
      !(
        mime === "application/acad" &&
        ["application/x-dwg", "image/vnd.dwg", "application/dwg"].includes(
          file.type,
        )
      ) &&
      !(
        mime === "application/dxf" &&
        ["image/vnd.dxf", "application/x-dxf"].includes(file.type)
      )
    )
      throw new AppError("نوع الملف لا يطابق المحتوى");
    const result = await withActor(user, async (c) => {
      const project = (
        await c.query("SELECT * FROM modern.projects WHERE id=$1 FOR UPDATE", [
          projectId,
        ])
      ).rows[0];
      if (!project) throw new AppError("المشروع غير موجود", 404);
      if (category === "receipts") {
        if (!["manager", "accountant"].includes(user.role))
          throw new AppError("إيصالات السداد للمحاسبة", 403);
      } else {
        const stage =
          category === "municipality_letters" && project.stage === 8
            ? 8
            : categoryStage[category];
        if (stage !== project.stage)
          throw new AppError(
            "يمكن رفع مخرجات المرحلة الحالية فقط؛ الملفات السابقة محفوظة للقراءة",
          );
        if (!["manager", "secretary"].includes(user.role)) {
          const assigned = (
            await c.query(
              "SELECT id FROM modern.assignments WHERE project_id=$1 AND stage=$2 AND user_id=$3",
              [projectId, stage, user.id],
            )
          ).rowCount;
          if (!assigned || stageRoles[stage] !== user.role)
            throw new AppError("الملف خارج نطاق تخصصك أو تعيينك", 403);
        }
      }
      if (reportId) {
        const report = (
          await c.query(
            "SELECT id FROM modern.reports WHERE id=$1 AND project_id=$2",
            [reportId, projectId],
          )
        ).rowCount;
        if (!report || !["site_photos", "site_reports"].includes(category))
          throw new AppError("مرجع التقرير غير صالح");
      }
      const inserted = (
        await c.query(
          "INSERT INTO modern.documents(project_id,name,category,mime_type,size,content,uploaded_by,report_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
          [
            projectId,
            name,
            category,
            mime,
            file.size,
            bytes,
            user.id,
            reportId,
          ],
        )
      ).rows[0];
      const auditId = await audit(c, user, "document_uploaded", projectId, {
        document_id: inserted.id,
        category,
        name,
      });
      await notify(c, projectId, "document_uploaded", auditId);
      return inserted;
    });
    return Response.json({ ok: true, id: result.id });
  } catch (e) {
    return apiError(e);
  }
}
