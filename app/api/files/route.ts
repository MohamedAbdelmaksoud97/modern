import { z } from "zod";
import { requireUser } from "@/lib/server/auth";
import { withActor } from "@/lib/server/db";
import { audit, notify } from "@/lib/server/business";
import { apiError, assertSameOrigin, rateLimit } from "@/lib/server/http";
import { AppError, categories, stageRoles } from "@/lib/server/rules";
import { drawingCategoriesByStage } from "@/lib/types";
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
    const existingDrawingId = z.string().uuid().nullable().parse(form.get("drawing_id"));
    const revisionNotes = z.string().trim().max(4000).parse(form.get("revision_notes") ?? "");
    const isDrawing = drawingCategoriesByStage[categoryStage[category]]?.includes(category);
    if (!isDrawing && (existingDrawingId || revisionNotes))
      throw new AppError("سجل التعديلات متاح للمخططات فقط");
    if (existingDrawingId && !revisionNotes)
      throw new AppError("أدخل ملاحظة توضح التعديل في النسخة الجديدة");
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
      // The project lock serializes numbering, uploads and stage delivery.
      let drawingId = existingDrawingId;
      let revision: number | null = null;
      if (drawingId) {
        const drawing = (
          await c.query(
            `SELECT max(d.revision_number) AS latest_revision
             FROM modern.drawing_series s JOIN modern.documents d ON d.drawing_id=s.id
             WHERE s.id=$1 AND s.project_id=$2 AND s.category=$3`,
            [drawingId, projectId, category],
          )
        ).rows[0];
        if (!drawing?.latest_revision)
          throw new AppError("المخطط غير موجود في المشروع أو نوع المستند المحدد", 404);
        revision = drawing.latest_revision + 1;
      } else if (isDrawing) {
        drawingId = (
          await c.query(
            "INSERT INTO modern.drawing_series(project_id,category,name) VALUES($1,$2,$3) RETURNING id",
            [projectId, category, name],
          )
        ).rows[0].id;
        revision = 1;
      }
      const inserted = (
        await c.query(
          `INSERT INTO modern.documents(project_id,name,category,mime_type,size,content,uploaded_by,report_id,drawing_id,revision_number,created_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,clock_timestamp()) RETURNING id`,
          [
            projectId,
            name,
            category,
            mime,
            file.size,
            bytes,
            user.id,
            reportId,
            drawingId,
            revision,
          ],
        )
      ).rows[0];
      if (revisionNotes)
        await c.query(
          "INSERT INTO modern.drawing_revision_notes(document_id,body) VALUES($1,$2)",
          [inserted.id, revisionNotes],
        );
      const auditId = await audit(c, user, "document_uploaded", projectId, {
        document_id: inserted.id,
        category,
        name,
        ...(drawingId ? { drawing_id: drawingId, revision_number: revision } : {}),
      });
      if (!drawingId) await notify(c, projectId, "document_uploaded", auditId);
      return {
        id: inserted.id,
        ...(drawingId ? { drawing_id: drawingId, revision_number: revision } : {}),
      };
    });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return apiError(e);
  }
}
