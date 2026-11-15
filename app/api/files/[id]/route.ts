import { z } from "zod";
import { requireUser } from "@/lib/server/auth";
import { withActor } from "@/lib/server/db";
import { apiError } from "@/lib/server/http";
import { AppError, fileDisposition } from "@/lib/server/rules";
export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const user = await requireUser();
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const download = new URL(request.url).searchParams.get("download") === "1";
    return await withActor(user, async (c) => {
      const document = (
        await c.query(
          "SELECT d.*,p.visibility FROM modern.documents d JOIN modern.projects p ON p.id=d.project_id WHERE d.id=$1",
          [id],
        )
      ).rows[0];
      if (!document) throw new AppError("الملف غير موجود أو غير مصرح", 404);
      const disposition = fileDisposition(
        document.mime_type,
        download,
        user.role,
        !!document.visibility?.download,
      );
      return new Response(new Uint8Array(document.content), {
        headers: {
          "Content-Type": document.mime_type,
          "Content-Length": String(document.size),
          "Content-Disposition": `${disposition}; filename="document"; filename*=UTF-8''${encodeURIComponent(document.name)}`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "sandbox; default-src 'none'",
          "Referrer-Policy": "no-referrer",
        },
      });
    });
  } catch (e) {
    return apiError(e);
  }
}
