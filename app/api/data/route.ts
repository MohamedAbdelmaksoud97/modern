import { requireUser } from "@/lib/server/auth";
import { getData } from "@/lib/server/business";
import { apiError } from "@/lib/server/http";
import { connection } from "next/server";
export async function GET() {
  await connection();
  try {
    return Response.json(await getData(await requireUser()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
