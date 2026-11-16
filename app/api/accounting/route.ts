import { requireUser } from "@/lib/server/auth";
import {
  accountingCommand,
  getOfficeLedger,
  ledgerLookups,
  listOfficeInvoices,
} from "@/lib/server/accounting";
import { apiError, assertSameOrigin, rateLimit } from "@/lib/server/http";
import { AppError } from "@/lib/server/rules";
import { connection } from "next/server";

export async function GET(request: Request) {
  await connection();
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const project = params.get("project");
    const result = project
      ? { documents: await listOfficeInvoices(user, project) }
      : params.has("lookups")
        ? await ledgerLookups(user)
        : await getOfficeLedger(user);
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await rateLimit("ledger:" + user.id, 120, 60);
    const raw = await request.text();
    if (raw.length > 100000) throw new AppError("الطلب كبير جداً", 413);
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new AppError("طلب غير صالح");
    }
    return Response.json(await accountingCommand(user, body));
  } catch (error) {
    return apiError(error);
  }
}
