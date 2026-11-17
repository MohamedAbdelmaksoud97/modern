import { drawingCategoriesByStage, roles, type Role } from "@/lib/types";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "VALIDATION_ERROR",
  ) {
    super(message);
  }
}
export const stageRoles: Record<number, Role> = {
  1: "architect",
  2: "civil_engineer",
  3: "draftsman",
  4: "municipality_draftsman",
  7: "site_supervisor",
};
const requiredOutputCategories: Partial<Record<number, readonly string[]>> = {
  ...drawingCategoriesByStage,
  0: ["contract"],
  6: ["supervision_contract"],
  7: ["site_reports"],
};
export const categories = [
  "architecture",
  "civil",
  "drawings_2d",
  "drawings_3d",
  "municipality",
  "site_photos",
  "site_reports",
  "contract",
  "supervision_contract",
  "municipality_letters",
  "receipts",
] as const;
export function allowedRole(role: unknown): Role {
  if (!roles.includes(role as Role)) throw new AppError("الدور غير صالح");
  return role as Role;
}
export function milli(value: unknown): number {
  const s = String(value);
  if (!/^\d{1,10}(\.\d{1,3})?$/.test(s))
    throw new AppError("أدخل مبلغاً موجباً بثلاث منازل عشرية كحد أقصى");
  const n = Math.round(Number(s) * 1000);
  if (!Number.isSafeInteger(n) || n <= 0) throw new AppError("المبلغ غير صالح");
  return n;
}
export function money(value: number): string {
  return (value / 1000).toFixed(3);
}
export function checkPayment(
  contract: unknown,
  paid: unknown,
  amount: unknown,
) {
  const n = milli(amount);
  if (n + Math.round(Number(paid) * 1000) > Math.round(Number(contract) * 1000))
    throw new AppError("الدفعة تتجاوز الرصيد المتبقي");
  return money(n);
}
export function checkAllocations(values: unknown[]) {
  let total = 0;
  for (const value of values) {
    const match = /^(\d{1,3})(?:\.(\d{1,3}))?$/.exec(String(value));
    if (!match) throw new AppError("نسبة الدفعة غير صالحة");
    const scaled =
      Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
    if (scaled <= 0 || scaled > 100000)
      throw new AppError("نسبة الدفعة غير صالحة");
    total += scaled;
  }
  if (total > 100000) throw new AppError("مجموع نسب الدفعات يتجاوز 100٪");
}
export function fileDisposition(
  mime: string,
  downloadRequested: boolean,
  role: Role,
  canDownload: boolean,
) {
  const attachment =
    downloadRequested ||
    !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
      mime,
    );
  if (role === "client" && attachment && !canDownload)
    throw new AppError("تحميل الملفات غير متاح لهذا المشروع", 403);
  return attachment ? "attachment" : "inline";
}
export function checkTransition(
  stage: number,
  outputs: string[],
  assigned: boolean,
  municipality: string | null,
  closure: string | null,
  role: Role,
) {
  if (stage >= 9) throw new AppError("المشروع مكتمل");
  if (stageRoles[stage] && role !== "manager" && !assigned)
    throw new AppError("يجب تعيين الموظف المسؤول");
  const outputCategories = requiredOutputCategories[stage];
  if (
    outputCategories &&
    !outputCategories.some((category) => outputs.includes(category))
  )
    throw new AppError("الملفات المطلوبة للمرحلة غير مكتملة");
  if (stage === 5 && municipality !== "approved")
    throw new AppError("يلزم اعتماد البلدية");
  if (stage === 8 && closure !== "approved")
    throw new AppError("يلزم اعتماد إنهاء الإشراف");
}
