import { requireUser } from "@/lib/server/auth";
import { officeReport } from "@/lib/server/office-reports";
import { apiError } from "@/lib/server/http";
import { connection } from "next/server";

export async function GET(request: Request) {
  await connection();
  try {
    return Response.json(
      await officeReport(
        await requireUser(),
        new URL(request.url).searchParams,
      ),
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
