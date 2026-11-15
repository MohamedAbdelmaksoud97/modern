import { clearSession } from "@/lib/server/auth";
import { apiError, assertSameOrigin } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await clearSession();
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
