import { requireUser } from "@/lib/server/auth";
import { command } from "@/lib/server/business";
import { apiError, assertSameOrigin } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    return Response.json(
      await command(await requireUser(), await request.json()),
    );
  } catch (e) {
    return apiError(e);
  }
}
