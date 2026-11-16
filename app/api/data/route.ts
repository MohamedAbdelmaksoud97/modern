import { requireUser } from "@/lib/server/auth";
import { getData } from "@/lib/server/business";
import { apiError } from "@/lib/server/http";
import { connection } from "next/server";
import { z } from "zod";
import { sectionCollections, type PlatformSection } from "@/lib/platform-scope";
export async function GET(request: Request) {
  await connection();
  try {
    const params = new URL(request.url).searchParams;
    const section = params.get("section");
    const scope =
      section === null
        ? undefined
        : {
            section: z
              .enum(
                Object.keys(sectionCollections) as [
                  PlatformSection,
                  ...PlatformSection[],
                ],
              )
              .parse(section),
            projectId: params.has("project_id")
              ? z.uuid().parse(params.get("project_id"))
              : undefined,
          };
    if (scope?.section === "project") z.uuid().parse(scope.projectId);
    return Response.json(await getData(await requireUser(), scope), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
