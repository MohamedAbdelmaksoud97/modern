import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  officeReportLabels,
  type LedgerData,
  type ReportPage,
} from "../../lib/accounting-types";

const fixtures = JSON.parse(
  readFileSync(
    process.env.ACCOUNTING_E2E_FIXTURES ?? ".local/e2e.json",
    "utf8",
  ),
);
const day = (daysAgo: number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuwait",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() - daysAgo * 86_400_000));
type Start = { id: string };
async function signIn(page: Page, role: string) {
  const user = fixtures.users[role];
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني أو رقم الهوية").fill(user.username);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  await expect(page).toHaveURL(
    role.includes("client") ? /\/portal$/ : /\/workspace$/,
  );
}
async function post<T = Start>(
  req: APIRequestContext,
  path: string,
  action: string,
  data: Record<string, unknown>,
  status = 200,
): Promise<T> {
  const r = await req.post(path, { data: { action, ...data } });
  expect(r.status(), action + " " + (await r.text())).toBe(status);
  return await r.json();
}
async function get<T>(req: APIRequestContext, path: string): Promise<T> {
  const r = await req.get(path);
  expect(r.status(), await r.text()).toBe(200);
  return await r.json();
}

test("office ledger, invoice privacy, reports and branded print on real Postgres", async ({
  page,
  browser,
}, info) => {
  const from = day(2),
    to = day(0),
    oldDue = day(32);
  const project = fixtures.projects.main.id,
    clientId = fixtures.clients.client.id;
  await signIn(page, "manager");
  const manager = page.request;
  const accountant = await browser.newPage({
    baseURL: info.project.use.baseURL,
  });
  const client = await browser.newPage({ baseURL: info.project.use.baseURL });
  await signIn(accountant, "accountant");
  await signIn(client, "client");
  const book = <T = Start>(
    action: string,
    data: Record<string, unknown>,
    status = 200,
  ) => post<T>(accountant.request, "/api/accounting", action, data, status);
  const admin = <T = Start>(
    action: string,
    data: Record<string, unknown>,
    status = 200,
  ) => post<T>(manager, "/api/accounting", action, data, status);
  const projectAction = (
    action: string,
    data: Record<string, unknown>,
    status = 200,
  ) =>
    post(
      manager,
      "/api/commands",
      action,
      { project_id: project, ...data },
      status,
    );
  const invoice = {
    direction: "sale",
    client_id: clientId,
    project_id: project,
    account_code: "4000",
    issue_date: from,
    due_date: to,
  };
  const item = (description: string, price: string) => [
    { description, quantity: 1, price },
  ];
  const report = (kind: string, entity?: string) =>
    get<ReportPage>(
      manager,
      "/api/office-reports?" +
        new URLSearchParams({
          kind,
          from,
          to,
          locale: "ar",
          compare: "1",
          ...(entity ? { entity } : {}),
        }),
    );
  await projectAction("create_quotation", { amount: "1200.125" });
  await projectAction("create_payment", {
    amount: "50.000",
    paid_at: oldDue,
    reference: "PRE-LEDGER",
  });
  await book("start", { date: from }, 403);
  await admin("start", { date: from });
  await projectAction(
    "create_payment",
    { amount: "1.000", paid_at: from, reference: "DUPLICATE-PATH" },
    400,
  );
  await admin("opening", {
    date: from,
    description: "رصيد افتتاحي معتمد",
    lines: [
      { account: "1010", amount: "1000.100" },
      { account: "3000", amount: "-1000.100" },
    ],
  });
  await admin(
    "adjustment",
    {
      date: from,
      description: "اختبار قيد غير متوازن",
      lines: [
        { account: "1010", amount: "1.000" },
        { account: "3000", amount: "-2.000" },
      ],
    },
    400,
  );
  await admin("save_identity", {
    name_ar: "مودرن للاستشارات الهندسية",
    name_en: "Modern Engineering Consultants",
    address: "السالمية، الكويت",
    email: "finance@modern.example",
    registration: "QATEST-001",
  });
  await projectAction("set_allocations", {
    allocations: [{ stage: 1, percentage: "50.000", due_date: to }],
  });
  const installment = await book("save_document", {
    ...invoice,
    allocation_stage: 1,
    items: [],
  });
  const draftInstallment = (await get<LedgerData>(manager, "/api/accounting"))
    .documents.find((d) => d.id === installment.id);
  expect(draftInstallment?.total).toBe("600.063");
  await book("cancel_draft", { id: installment.id });
  const older = await admin("save_document", {
    ...invoice,
    project_id: null,
    due_date: oldDue,
    opening: true,
    items: item("مستحق من دفتر سابق", "30.010"),
  });
  await admin("issue_document", { id: older.id });
  await accountant.goto("/workspace/accounting");
  await accountant.getByRole("tab", { name: "الفواتير والتحصيل" }).click();
  await accountant
    .getByRole("button", { name: "فاتورة عميل", exact: true })
    .click();
  const draft = accountant.getByRole("dialog");
  await draft.getByRole("combobox", { name: "العميل", exact: true }).click();
  await accountant
    .getByRole("option", { name: fixtures.clients.client.name, exact: true })
    .click();
  await draft
    .getByRole("combobox", { name: "المشروع (اختياري)", exact: true })
    .click();
  await accountant
    .getByRole("option", { name: fixtures.projects.main.name, exact: true })
    .click();
  await draft.getByLabel("تاريخ الإصدار").fill(from);
  await draft.getByLabel("تاريخ الاستحقاق").fill(to);
  await draft.getByLabel("وصف البند").fill("تصميم معماري وإشراف للفيلا");
  await draft.getByLabel("سعر الوحدة د.ك").fill("900.125");
  const saved = accountant.waitForResponse(
    (r) =>
      r.url().endsWith("/api/accounting") && r.request().method() === "POST",
  );
  await draft.getByRole("button", { name: "حفظ المسودة" }).click();
  const response = await saved;
  expect(response.status(), await response.text()).toBe(200);
  const main = (await response.json()) as Start;
  await expect(draft).toBeHidden();
  await projectAction("set_visibility", {
    visibility: { invoices: true, payments: true, balance: true },
  });
  const fromPortal = () =>
    get<{ documents: LedgerData["documents"] }>(
      client.request,
      "/api/accounting?project=" + project,
    );
  expect((await fromPortal()).documents).toHaveLength(0);
  await book("issue_document", { id: main.id });
  await book(
    "save_document",
    {
      ...invoice,
      id: main.id,
      items: item("محاولة تعديل فاتورة معتمدة", "100.000"),
    },
    400,
  );
  const other = await book("save_document", {
    ...invoice,
    project_id: null,
    items: item("استشارة هندسية منفصلة", "100.000"),
  });
  await book("issue_document", { id: other.id });
  await book("receipt", {
    client_id: clientId,
    date: from,
    account: "1010",
    amount: "250.025",
    reference: "RCT-081",
    items: [
      { document_id: main.id, amount: "200.025" },
      { document_id: other.id, amount: "25.000" },
    ],
  });
  await book(
    "apply_advance",
    {
      client_id: clientId,
      date: to,
      items: [{ document_id: other.id, amount: "25.001" }],
    },
    400,
  );
  await book("apply_advance", {
    client_id: clientId,
    date: to,
    items: [{ document_id: other.id, amount: "25.000" }],
  });
  await book("credit", {
    id: main.id,
    date: to,
    amount: "10.100",
    reason: "خصم تجاري متفق عليه",
  });
  const issued = (await fromPortal()).documents;
  expect(issued.map((d) => d.id)).toEqual([main.id]);
  expect(issued[0]).toMatchObject({
    outstanding: "690.000",
    paid: "200.025",
    credited: "10.100",
  });
  expect((await client.request.get("/api/accounting")).status()).toBe(403);
  expect(
    (
      await accountant.request.get(
        "/api/office-reports?kind=summary&from=" + from + "&to=" + to,
      )
    ).status(),
  ).toBe(403);
  const outsider = await browser.newPage({ baseURL: info.project.use.baseURL });
  await signIn(outsider, "other_client");
  expect(
    (
      await get<{ documents: unknown[] }>(
        outsider.request,
        "/api/accounting?project=" + project,
      )
    ).documents,
  ).toHaveLength(0);
  await outsider.close();
  const platform = await get<{
    projects: { id: string; balance: string; paid_total: string }[];
  }>(manager, "/api/data");
  expect(platform.projects.find((p) => p.id === project)).toMatchObject({
    balance: "950.100",
    paid_total: "250.025",
  });
  const vendor = await book("save_vendor", {
    name: "توريدات السالمية",
    reference: "SUP-40",
  });
  const vendorDraft = {
    direction: "purchase",
    vendor_id: vendor.id,
    project_id: project,
    account_code: "5000",
    issue_date: from,
    due_date: to,
    external_ref: "KWT-937",
    items: item("مراجعة المخططات", "150.125"),
  };
  const bill = await book("save_document", vendorDraft);
  await book("save_document", vendorDraft, 409);
  await book("issue_document", { id: bill.id });
  await book("vendor_payment", {
    vendor_id: vendor.id,
    date: to,
    account: "1010",
    items: [{ document_id: bill.id, amount: "50.025" }],
  });
  await book("expense", {
    date: to,
    description: "طباعة مخططات المشروع",
    from: "1010",
    to: "5000",
    amount: "20.125",
    project_id: project,
  });
  await book("transfer", {
    date: to,
    description: "إيداع بنكي",
    from: "1010",
    to: "1020",
    amount: "100.000",
  });
  await book("payroll", {
    date: to,
    description: "إجمالي الرواتب",
    from: "1010",
    to: "5200",
    amount: "100.000",
  });
  const mistaken = await book("expense", {
    date: to,
    description: "مصروف مسجل بالخطأ",
    from: "1010",
    to: "5100",
    amount: "10.000",
  });
  await book("reverse", { id: mistaken.id, date: to, reason: "تصحيح" }, 403);
  await admin("reverse", {
    id: mistaken.id,
    date: to,
    reason: "تصحيح مصروف مكرر",
  });
  const ledger = await get<LedgerData>(manager, "/api/accounting");
  const bank = ledger.entries
    .flatMap((e) => e.lines)
    .filter((l) => l.account_code === "1020");
  await book("reconcile", {
    account: "1020",
    date: to,
    statement_balance: "100.000",
    lines: bank.map((l) => l.id),
  });
  const reconciled = (await get<LedgerData>(manager, "/api/accounting"))
    .reconciliations[0];
  expect(reconciled).toMatchObject({
    statement_balance: "100.000",
    cleared_balance: "100.000",
  });
  const inquiry = await manager.post("/api/inquiries", {
    data: {
      name: "مركز السالمية",
      phone: "+96555550000",
      service: "تصميم معماري",
      message: "تصميم وتجهيز مبنى إداري من ثلاثة طوابق",
    },
  });
  expect(inquiry.status(), await inquiry.text()).toBe(200);
  await page.goto("/workspace/inquiries");
  await page.getByRole("link", { name: "إنشاء مشروع من الطلب" }).click();
  const projectDialog = page.getByRole("dialog");
  await projectDialog.getByLabel("اسم المشروع").fill("مبنى السالمية الإداري");
  await projectDialog
    .getByRole("combobox", { name: "العميل", exact: true })
    .click();
  await page.getByRole("option").first().click();
  await projectDialog.getByLabel("موقع المشروع").fill("السالمية، الكويت");
  await projectDialog.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(projectDialog).toBeHidden();
  expect(
    (await report("inquiries")).rows.some((r) =>
      r.cells.includes("مبنى السالمية الإداري"),
    ),
  ).toBe(true);
  expect(
    (await report("profitability", project)).rows[0].cells.slice(-3),
  ).toEqual(["890.025", "170.250", "719.775"]);
  expect((await report("payables", vendor.id)).totals?.cells.at(-1)).toBe(
    "100.100",
  );
  expect(
    (await report("client", clientId)).rows.some((r) =>
      String(r.cells[3]).includes(issued[0].number + " (200.025)"),
    ),
  ).toBe(true);
  expect((await report("trial")).totals?.cells.at(-1)).toBe("0.000");
  expect((await report("position")).totals?.cells.slice(-2)[0]).toBe(
    (await report("position")).totals?.cells.at(-1),
  );
  for (const kind of Object.keys(officeReportLabels)) {
    const result = await report(
      kind,
      kind === "client" ? clientId : kind === "vendor" ? vendor.id : undefined,
    );
    expect(result.columns.length, kind).toBeGreaterThan(0);
    expect(result.comparison, kind).toBeDefined();
  }
  await admin("close_period", { date: to, reason: "إقفال تجريبي" });
  await book(
    "expense",
    {
      date: to,
      description: "حركة بعد إغلاق الفترة",
      from: "1010",
      to: "5100",
      amount: "1.000",
    },
    400,
  );

  await page.goto("/workspace/accounting?tab=documents&document=" + main.id);
  await expect(
    page.getByRole("dialog").getByText("تصميم معماري وإشراف للفيلا"),
  ).toBeVisible();
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page.getByRole("button", { name: "طباعة / حفظ PDF" }).click();
  await expect(page.locator(".office-print-sheet")).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: join(info.outputDir, "invoice-ar.pdf"),
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.goto("/workspace/reports");
  await page.getByLabel("نوع التقرير").selectOption("profitability");
  await page.getByLabel("من تاريخ").fill(from);
  await page.getByLabel("إلى تاريخ").fill(to);
  await page
    .getByText("إظهار الفترة السابقة بنفس المدة", { exact: true })
    .click();
  await page.getByRole("button", { name: "عرض التقرير" }).click();
  await expect(
    page.getByRole("heading", { name: "ربحية المشروعات" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /الفترة السابقة/ }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page.getByRole("button", { name: "طباعة / حفظ PDF" }).click();
  await expect(page.locator(".office-print-sheet")).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: join(info.outputDir, "management-report-ar.pdf"),
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.evaluate(() => localStorage.setItem("modern_locale", "en"));
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/workspace/reports");
  await expect(
    page.getByRole("heading", { name: "Reports" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await accountant.close();
  await client.close();
});
