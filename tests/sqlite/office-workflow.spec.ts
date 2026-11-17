import {
  test,
  expect,
  type Locator,
  type Page,
  type Browser,
} from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { openFixtureDatabase } from "../../scripts/sqlite-workflow-db.mjs";
import {
  stageLabels,
  roleLabels,
  type Document,
  type PlatformData,
} from "../../lib/types";

type Account = { email: string; password: string };
const run = process.env.SQLITE_WORKFLOW_RUN!;
const office = JSON.parse(
  readFileSync(join(run, "manager.json"), "utf8"),
) as Account;
const roles = [
  "secretary",
  "accountant",
  "architect",
  "civil_engineer",
  "draftsman",
  "municipality_draftsman",
  "site_supervisor",
] as const;
const projectName = "فيلا الاختبار الشامل";
const clientName = "عميل الاختبار المحلي";
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n",
);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lm8AAAAASUVORK5CYII=",
  "base64",
);

async function select(
  root: Page | Locator,
  label: string,
  option: string | RegExp,
) {
  await root.getByRole("combobox", { name: label, exact: true }).click();
  // Base UI renders options in a portal outside the form or dialog.
  const page = "page" in root ? root.page() : root;
  await page
    .getByRole("option", { name: option, exact: typeof option === "string" })
    .click();
}

async function submit(
  page: Page,
  button: Locator,
  route = "/api/commands",
  status = 200,
) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith(route) && r.request().method() === "POST",
    ),
    button.click(),
  ]);
  if (response.status() !== status) {
    const result = await response.json().catch(() => ({}));
    throw new Error(
      route +
        " returned " +
        response.status() +
        ": " +
        (result.error || "unexpected response"),
    );
  }
  return response;
}

async function dashboard(page: Page) {
  await expect(page.locator("#workspace-main")).toBeVisible();
}

async function login(page: Page, account: Account, portal = false) {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني أو رقم الهوية").fill(account.email);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(account.password);
  await submit(
    page,
    page.getByRole("button", { name: "تسجيل الدخول", exact: true }),
    "/api/auth/login",
  );
  await expect(page).toHaveURL(/\/change-password$/);
  await page.getByLabel("كلمة المرور الحالية").fill(account.password);
  await page
    .getByLabel("كلمة المرور الجديدة")
    .fill("New-" + randomBytes(18).toString("base64url"));
  await submit(
    page,
    page.getByRole("button", { name: "حفظ كلمة المرور", exact: true }),
    "/api/auth/password",
  );
  await expect(page).toHaveURL(portal ? /\/portal$/ : /\/workspace$/);
  await dashboard(page);
}

async function newActor(
  browser: Browser,
  baseURL: string,
  account: Account,
  portal = false,
) {
  const context = await browser.newContext({ baseURL, acceptDownloads: true });
  const page = await context.newPage();
  await login(page, account, portal);
  return page;
}

async function dialogSubmit(
  page: Page,
  label = "حفظ",
  route = "/api/commands",
) {
  const dialog = page.getByRole("dialog");
  await submit(
    page,
    dialog.getByRole("button", { name: label, exact: true }),
    route,
  );
  await expect(dialog).toBeHidden();
}

async function show(page: Page, path: string, stage?: number) {
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: projectName, exact: true }),
  ).toBeVisible();
  if (stage !== undefined) {
    await expect(
      page
        .locator('[data-slot="badge"]')
        .filter({ hasText: new RegExp("^" + stageLabels[stage] + "$") })
        .first(),
    ).toBeVisible();
  }
}

async function tab(page: Page, name: string) {
  await page.getByRole("tab", { name, exact: true }).click();
}

async function upload(
  page: Page,
  category: string,
  name: string,
  report?: string,
) {
  await tab(page, "المستندات");
  const drawing = ["الرسومات المعمارية", "الملفات المدنية", "رسومات الواجهات 2D", "رسومات الواجهات 3D", "ملف البلدية والرخصة"].includes(category);
  await page.getByRole("button", { name: drawing ? "رفع مخطط جديد" : "رفع مستند", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await select(dialog, "نوع المستند", category);
  if (report) await select(dialog, "ربط بتقرير زيارة", new RegExp(report));
  const photo = name.endsWith(".png");
  await dialog.getByLabel("الملف", { exact: true }).setInputFiles({
    name,
    mimeType: photo ? "image/png" : "application/pdf",
    buffer: photo ? png : pdf,
  });
  await dialogSubmit(page, "رفع الملف", "/api/files");
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

async function revise(page: Page, drawing: string, name: string, note: string) {
  const history = page.getByRole("article", { name: drawing, exact: true });
  await history.getByRole("button", { name: "رفع نسخة جديدة", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const notes = dialog.getByLabel("ملاحظة التعديل", { exact: true });
  await expect(notes).toHaveAttribute("required", "");
  await notes.fill(note);
  await dialog.getByLabel("الملف", { exact: true }).setInputFiles({
    name,
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await dialogSubmit(page, "رفع الملف", "/api/files");
  await expect(history.getByText(name, { exact: true })).toBeVisible();
  await expect(history.getByText(note, { exact: true })).toBeVisible();
}

async function projectDocuments(page: Page, path: string): Promise<Document[]> {
  const response = await page.request.get("/api/data");
  expect(response.status()).toBe(200);
  const id = path.split("/").at(-1);
  return ((await response.json()).documents as Document[]).filter((doc) => doc.project_id === id);
}

async function advance(page: Page, next: number, blocked = false) {
  await page
    .getByRole("button", { name: "تسليم المرحلة", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  if (blocked) {
    await submit(
      page,
      dialog.getByRole("button", { name: "تأكيد التسليم", exact: true }),
      "/api/commands",
      400,
    );
    await expect(dialog.getByRole("alert")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    return;
  }
  await dialogSubmit(page, "تأكيد التسليم");
  await expect(
    page
      .locator('[data-slot="badge"]')
      .filter({ hasText: new RegExp("^" + stageLabels[next] + "$") })
      .first(),
  ).toBeVisible();
}

async function decide(
  page: Page,
  decision: string,
  reason: string,
  stage?: string,
) {
  const form = page
    .locator("form")
    .filter({ has: page.getByLabel("سبب القرار والملاحظات") });
  await select(form, "القرار", decision);
  if (stage) await select(form, "إرجاع المشروع إلى مرحلة", stage);
  await form.getByLabel("سبب القرار والملاحظات").fill(reason);
  await submit(page, form.getByRole("button", { name: "حفظ", exact: true }));
  if (stage) await expect(form).toHaveCount(0);
  else
    await expect(
      form.getByRole("button", { name: "حفظ", exact: true }),
    ).toBeEnabled();
}

async function visit(page: Page, name: string) {
  await tab(page, "تقارير الإشراف");
  await page
    .getByRole("button", { name: "تقرير زيارة جديد", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("عنوان التقرير").fill(name);
  await dialog
    .getByLabel("الأعمال والملاحظات")
    .fill("تمت مراجعة تنفيذ الأعمال وفق الملف المعتمد.");
  await dialogSubmit(page);
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

test("مدير ينشئ كل الموظفين، وكل موظف يكمل مرحلته من المتصفح حتى الإغلاق", async ({
  page,
  browser,
  baseURL,
}) => {
  await test.step("المدير يغيّر كلمة المرور وينشئ الحسابات السبعة من لوحة الفريق", async () => {
    await login(page, office);
    await page.goto("/workspace/team");
    await dashboard(page);
  });
  const accounts = {} as Record<(typeof roles)[number], Account>;
  for (const role of roles) {
    await test.step("إنشاء حساب " + roleLabels[role], async () => {
      const employee = {
        email: role + "@modern.test",
        password: "Initial-" + randomBytes(16).toString("base64url"),
      };
      await page
        .getByRole("button", { name: "إضافة موظف", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog
        .getByLabel("الاسم الكامل")
        .fill(roleLabels[role] + " تجريبي");
      await dialog.getByLabel("بريد الموظف").fill(employee.email);
      await select(dialog, "الدور الوظيفي", roleLabels[role]);
      await dialog
        .getByLabel("كلمة المرور الأولية", { exact: true })
        .fill(employee.password);
      await dialogSubmit(page);
      await expect(
        page.getByText(employee.email, { exact: true }),
      ).toBeVisible();
      accounts[role] = employee;
    });
  }
  await page.screenshot({ path: join(run, "employees.png"), fullPage: true });
  const secretary = await newActor(browser, baseURL!, accounts.secretary);
  let client!: Account;
  let project!: string;
  await test.step("السكرتارية تستقبل العميل وتنشئ حسابه والمشروع", async () => {
    await secretary.goto("/workspace/clients");
    await secretary
      .getByRole("button", { name: "عميل جديد", exact: true })
      .click();
    const dialog = secretary.getByRole("dialog", { name: "عميل جديد" });
    await dialog.getByLabel("اسم العميل").fill(clientName);
    await dialog.getByLabel("رقم الهوية", { exact: true }).fill("299010100001");
    await dialog.getByLabel("رقم الهاتف الدولي").fill("+96555560001");
    await submit(
      secretary,
      dialog.getByRole("button", { name: "حفظ", exact: true }),
    );
    const issued = secretary.getByRole("dialog", {
      name: "بيانات الدخول الجديدة",
    });
    await expect(issued).toBeVisible();
    const [email, password] = await issued.locator("bdi").allTextContents();
    client = { email, password };
    await issued
      .getByRole("button", { name: "تم استلام البيانات", exact: true })
      .click();
    await secretary.goto("/workspace/projects?new=1");
    const newProject = secretary.getByRole("dialog");
    await newProject.getByLabel("اسم المشروع").fill(projectName);
    await select(newProject, "العميل", clientName);
    await newProject.getByLabel("موقع المشروع").fill("الكويت، موقع تجريبي");
    await dialogSubmit(secretary);
    const link = secretary.getByRole("link", {
      name: projectName,
      exact: true,
    });
    project = (await link.getAttribute("href"))!;
    await link.click();
    await expect(
      secretary.getByRole("heading", { name: projectName }),
    ).toBeVisible();
  });
  await test.step("السكرتارية تسند المراحل وتسلّم الاستقبال بعد رفع العقد", async () => {
    for (const [stage, role] of [
      [1, "architect"],
      [2, "civil_engineer"],
      [3, "draftsman"],
      [4, "municipality_draftsman"],
      [7, "site_supervisor"],
    ] as const) {
      await select(secretary, "المرحلة", stageLabels[stage]);
      await select(
        secretary,
        "الموظف",
        new RegExp(roleLabels[role] + " تجريبي"),
      );
      await submit(
        secretary,
        secretary.getByRole("button", { name: "إسناد المهمة", exact: true }),
      );
      await expect(
        secretary
          .getByText(roleLabels[role] + " تجريبي", { exact: true })
          .last(),
      ).toBeVisible();
    }
    await advance(secretary, 1, true);
    await upload(
      secretary,
      "عقد المشروع والمستندات الأولية",
      "01-contract.pdf",
    );
    await advance(secretary, 1);
  });
  const civil = await newActor(browser, baseURL!, accounts.civil_engineer);
  const supervisor = await newActor(
    browser,
    baseURL!,
    accounts.site_supervisor,
  );
  await test.step("المدني والإشراف لا يستطيعان فتح مشروع لم يصل إلى مرحلتهما", async () => {
    for (const employee of [civil, supervisor]) {
      await employee.goto(project);
      await expect(
        employee.getByText("المشروع غير متاح", { exact: true }),
      ).toBeVisible();
    }
  });
  const architect = await newActor(browser, baseURL!, accounts.architect);
  await test.step("السكرتارية تُسند مهمة للمعماري والمعماري يغيّر حالتها إلى مكتملة", async () => {
    const title = "مراجعة المخططات قبل تسليم المرحلة";
    await secretary.goto("/workspace/tasks");
    await secretary
      .getByRole("button", { name: "مهمة جديدة", exact: true })
      .click();
    const createTask = secretary.getByRole("dialog");
    await createTask.getByLabel("عنوان المهمة").fill(title);
    await select(createTask, "المشروع", projectName);
    await select(
      createTask,
      "الموظف المسؤول",
      roleLabels.architect + " تجريبي",
    );
    await dialogSubmit(secretary);
    await architect.goto("/workspace/tasks");
    const task = architect.locator("article").filter({ hasText: title });
    await select(task, "حالة المهمة", "مكتملة");
    await submit(
      architect,
      task.getByRole("button", { name: "تحديث", exact: true }),
    );
    const completed = architect
      .locator("section")
      .filter({
        has: architect.getByRole("heading", { name: "مكتملة", exact: true }),
      });
    await expect(
      completed.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await civil.goto("/workspace/tasks");
    await dashboard(civil);
    await expect(
      civil.getByRole("heading", { name: title, exact: true }),
    ).toHaveCount(0);
  });
  const draftsman = await newActor(browser, baseURL!, accounts.draftsman);
  const municipality = await newActor(
    browser,
    baseURL!,
    accounts.municipality_draftsman,
  );
  await test.step("المعماري والمدني والرسامون يرفعون مخرجاتهم ويُسلّمون المراحل بأنفسهم", async () => {
    await show(architect, project, 1);
    await advance(architect, 2, true);
    await upload(architect, "الرسومات المعمارية", "02-architecture.pdf");
    await advance(architect, 2);
    await show(civil, project, 2);
    await upload(civil, "الملفات المدنية", "03-civil.pdf");
    await advance(civil, 3);
    await show(draftsman, project, 3);
    await advance(draftsman, 4, true);
    await upload(draftsman, "رسومات الواجهات 2D", "04-facade-2d.pdf");
    for (const version of [2, 3, 4]) {
      await revise(draftsman, "04-facade-2d", `facade-${version}.pdf`, `تعديل الواجهة ${version}`);
    }
    const facade = draftsman.getByRole("article", { name: "04-facade-2d" });
    await expect(facade.getByText("v4", { exact: true })).toBeVisible();
    await facade.getByText(/النسخ السابقة/).click();
    await expect(facade.getByText("v1", { exact: true })).toBeVisible();
    await draftsman.evaluate(() => localStorage.setItem("modern_locale", "en"));
    await draftsman.reload();
    await tab(draftsman, "Documents");
    await expect(draftsman.getByRole("heading", { name: "Revision history" })).toBeVisible();
    await expect(draftsman.getByRole("heading", { name: "Facade drawings" })).toBeVisible();
    await facade.getByRole("button", { name: "Upload revision" }).click();
    await expect(draftsman.getByRole("dialog").getByLabel("Revision note")).toBeVisible();
    await draftsman.keyboard.press("Escape");
    await draftsman.evaluate(() => localStorage.setItem("modern_locale", "ar"));
    await draftsman.reload();
    await advance(draftsman, 4);
    await show(municipality, project, 4);
    await upload(municipality, "ملف البلدية والرخصة", "06-municipality.pdf");
    await advance(municipality, 5);
  });
  const portal = await newActor(browser, baseURL!, client, true);
  await test.step("رفض البلدية وإعادة العمل ثم القبول ورفع عقد الإشراف", async () => {
    const projectId = project.split("/").at(-1);
    const visibility = await page.request.post("/api/commands", {
      data: { action: "set_visibility", project_id: projectId, visibility: { municipality: true } },
    });
    expect(visibility.status()).toBe(200);
    const original = (await projectDocuments(portal, project)).find((doc) => doc.category === "municipality")!;
    expect(original.revision_number).toBe(1);
    await show(secretary, project, 5);
    await advance(secretary, 6, true);
    await decide(
      secretary,
      "رفض الطلب",
      "مراجعة مرفقات البلدية وإعادة التقديم",
      stageLabels[4],
    );
    await show(municipality, project, 4);
    await advance(municipality, 5, true);
    await tab(municipality, "المستندات");
    const note = "تم تحديث مرفقات البلدية";
    await revise(municipality, "06-municipality", "07-municipality-revision.pdf", note);
    const draft = (await projectDocuments(municipality, project)).find((doc) => doc.name === "07-municipality-revision.pdf")!;
    expect(draft.revision_number).toBe(2);
    expect(draft.revision_notes).toBe(note);
    expect((await projectDocuments(portal, project)).map((doc) => doc.id)).toEqual([original.id]);
    expect((await portal.request.get(`/api/files/${draft.id}`)).status()).toBe(404);
    expect((await portal.request.get(`/api/files/${original.id}`)).status()).toBe(200);
    await advance(municipality, 5);
    const delivered = await projectDocuments(portal, project);
    expect(delivered.map((doc) => doc.id)).toEqual([draft.id]);
    expect(delivered[0]).not.toHaveProperty("revision_notes");
    expect((await portal.request.get(`/api/files/${original.id}?download=1`)).status()).toBe(404);
    expect((await portal.request.get(`/api/files/${draft.id}`)).status()).toBe(200);
    expect((await page.request.post("/api/commands", {
      data: { action: "set_visibility", project_id: projectId, visibility: {} },
    })).status()).toBe(200);
    await show(secretary, project, 5);
    await decide(secretary, "قبول الطلب", "صدور موافقة البلدية التجريبية");
    await advance(secretary, 6);
    await upload(secretary, "عقد الإشراف", "08-supervision-contract.pdf");
    await advance(secretary, 7);
  });
  await test.step("مهندس الإشراف يقرأ ملفات سابقة ويرفع زيارتين وصورًا مرتبطة", async () => {
    await show(supervisor, project, 7);
    await tab(supervisor, "المستندات");
    await expect(
      supervisor.getByText("02-architecture.pdf", { exact: true }),
    ).toBeVisible();
    await visit(supervisor, "زيارة الموقع الأولى");
    await upload(
      supervisor,
      "صور الموقع",
      "09-site-visit.png",
      "زيارة الموقع الأولى",
    );
    await tab(supervisor, "تقارير الإشراف");
    await expect(
      supervisor.getByText("09-site-visit.png", { exact: true }),
    ).toBeVisible();
    await visit(supervisor, "زيارة الموقع الثانية");
    await upload(
      supervisor,
      "تقارير الإشراف",
      "10-supervision-report.pdf",
      "زيارة الموقع الثانية",
    );
    await advance(supervisor, 8);
  });
  await test.step("إرجاع طلب الإنهاء إلى الإشراف ومعالجته ثم إغلاق المشروع", async () => {
    await show(secretary, project, 8);
    await decide(
      secretary,
      "تعديلات مطلوبة",
      "يلزم تقرير زيارة جديد",
      stageLabels[7],
    );
    await show(supervisor, project, 7);
    await advance(supervisor, 8, true);
    await visit(supervisor, "زيارة معالجة الملاحظات");
    await upload(
      supervisor,
      "تقارير الإشراف",
      "11-closure-correction.pdf",
      "زيارة معالجة الملاحظات",
    );
    await advance(supervisor, 8);
    await show(secretary, project, 8);
    await upload(secretary, "خطابات البلدية", "12-closure-letter.pdf");
    await decide(secretary, "قبول الطلب", "اعتماد إنهاء الإشراف");
    await advance(secretary, 9);
    await secretary.screenshot({
      path: join(run, "completed-project.png"),
      fullPage: true,
    });
  });
  const accountant = await newActor(browser, baseURL!, accounts.accountant);
  await test.step("السكرتارية تصدر عرض السعر والمحاسب يوزّع النسب ويسجّل الدفعة", async () => {
    await tab(secretary, "المالية");
    await secretary
      .getByRole("button", { name: "عرض سعر جديد", exact: true })
      .click();
    await secretary
      .getByRole("dialog")
      .getByLabel("القيمة الإجمالية (د.ك)", { exact: true })
      .fill("1200.125");
    await dialogSubmit(secretary);
    await show(accountant, project, 9);
    await tab(accountant, "المالية");
    await accountant
      .getByRole("button", { name: "توزيع النسب", exact: true })
      .click();
    const allocation = accountant.getByRole("dialog");
    await allocation.getByLabel("%", { exact: true }).nth(1).fill("30.125");
    await allocation.getByLabel("%", { exact: true }).nth(7).fill("69.875");
    await dialogSubmit(accountant);
    await accountant
      .getByRole("button", { name: "تسجيل دفعة", exact: true })
      .click();
    const payment = accountant.getByRole("dialog");
    await payment.getByLabel("المبلغ (د.ك)", { exact: true }).fill("200.025");
    await payment.getByLabel(/مرجع العملية/).fill("LOCAL-PAY-01");
    await dialogSubmit(accountant);
    await expect(
      accountant.getByText("LOCAL-PAY-01", { exact: true }),
    ).toBeVisible();
  });
  await test.step("المدير يشارك المرحلة والرصيد وملفًا واحدًا والعميل يرى المسموح فقط", async () => {
    await show(page, project, 9);
    await tab(page, "صلاحيات العميل");
    for (const label of [
      "حالة المشروع والمرحلة",
      "المبلغ المتبقي",
      "الرسومات المعمارية",
    ]) {
      await page.getByRole("switch", { name: label, exact: true }).click();
    }
    await submit(
      page,
      page
        .getByRole("tabpanel")
        .getByRole("button", { name: "حفظ", exact: true }),
    );
    await show(portal, project.replace("/workspace", "/portal"), 9);
    await tab(portal, "المالية");
    await expect(
      portal.getByText("المبلغ المتبقي", { exact: true }),
    ).toBeVisible();
    await expect(portal.getByText(/١[٬,]?٠٠٠[٫.]١٠٠/)).toBeVisible();
    await expect(portal.getByText("LOCAL-PAY-01", { exact: true })).toHaveCount(
      0,
    );
    await tab(portal, "المستندات");
    await expect(
      portal.getByText("02-architecture.pdf", { exact: true }),
    ).toBeVisible();
    await expect(portal.getByText("03-civil.pdf", { exact: true })).toHaveCount(
      0,
    );
    await expect(portal.locator('a[href$="?download=1"]')).toHaveCount(0);
    const viewUrl = await portal
      .locator('a[href^="/api/files/"]')
      .getAttribute("href");
    expect(viewUrl).toBeTruthy();
    const visibleFile = await portal.request.get(viewUrl!);
    expect(visibleFile.status()).toBe(200);
    expect(await visibleFile.body()).toEqual(pdf);
    expect((await portal.request.get(viewUrl! + "?download=1")).status()).toBe(
      403,
    );
    await tab(accountant, "المستندات");
    await expect(
      accountant.getByText("02-architecture.pdf", { exact: true }),
    ).toHaveCount(0);
    await portal.screenshot({
      path: join(run, "client-portal.png"),
      fullPage: true,
    });
  });
  await test.step("سجل المراجعة وطابور واتساب يتسجلان ويظهر أن المزود غير مهيأ", async () => {
    await page.goto("/workspace/audit");
    await expect(
      page.getByText("تسجيل قرار البلدية", { exact: true }).first(),
    ).toBeVisible();
    await page.goto("/workspace/whatsapp");
    await expect(
      page.getByText(/غير مُعد|غير مهيأ|غير متصل/).first(),
    ).toBeVisible();
    await tab(page, "سجل الرسائل");
    await expect(
      page.getByText("إنشاء مشروع", { exact: true }).first(),
    ).toBeVisible();
    await page.screenshot({
      path: join(run, "whatsapp-queue.png"),
      fullPage: true,
    });
  });
  await test.step("إغلاق مشروع بدون إشراف بعد اعتماد البلدية", async () => {
    const dataResponse = await page.request.get("/api/data");
    expect(dataResponse.ok()).toBe(true);
    const data: PlatformData = await dataResponse.json();
    const original = data.projects.find((p) => p.id === project.split("/").at(-1))!;
    expect(original.completed_without_supervision).toBe(false);
    const supervisorId = data.users.find((u) => u.role === "site_supervisor")!.id;
    const created = await page.request.post("/api/commands", {
      data: {
        action: "create_project",
        name: "مشروع تصميم وترخيص فقط",
        client_id: original.client_id,
        location: "الكويت",
      },
    });
    expect(created.ok()).toBe(true);
    const { id } = await created.json();
    const path = "/workspace/projects/" + id;
    const db = openFixtureDatabase(join(run, "workflow.sqlite"));
    try {
      db.prepare("UPDATE projects SET stage=5 WHERE id=?").run(id);
    } finally {
      db.close();
    }
    expect((await page.request.post("/api/commands", {
      data: { action: "assign", project_id: id, stage: 7, user_id: supervisorId },
    })).ok()).toBe(true);

    await secretary.setViewportSize({ width: 390, height: 844 });
    await secretary.evaluate(() => localStorage.setItem("modern_theme", "dark"));
    await secretary.goto(path);
    await expect(secretary.locator("html")).toHaveClass(/dark/);
    const label = "إنهاء المشروع بدون إشراف";
    const close = secretary.getByRole("button", { name: label, exact: true });
    await expect(close).toHaveCount(0);
    const beforeApproval = await secretary.request.post("/api/commands", {
      data: { action: "transition", project_id: id, version: 1, without_supervision: true },
    });
    expect(beforeApproval.status()).toBe(400);
    expect((await beforeApproval.json()).error).toBe("يلزم اعتماد البلدية");
    await decide(secretary, "قبول الطلب", "صدور موافقة البلدية");

    await page.goto(path);
    await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    await close.focus();
    await expect(close).toBeFocused();
    await secretary.keyboard.press("Enter");
    const dialog = secretary.getByRole("dialog", { name: label });
    await expect(dialog).toBeVisible();
    await secretary.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(close).toBeVisible();
    await close.click();
    await dialogSubmit(secretary, "تأكيد إنهاء المشروع");
    await expect(secretary.locator('[data-slot="badge"]').filter({ hasText: /^مكتمل$/ })).toBeVisible();
    await expect(secretary.getByRole("region", { name: "مراحل المشروع" }).getByText("تم التخطي")).toHaveCount(3);
    const completed: PlatformData = await (await page.request.get("/api/data")).json();
    expect(completed.projects.find((p) => p.id === id)).toMatchObject({
      stage: 9,
      status: "completed",
      completed_without_supervision: true,
      closure_decision: null,
    });
    expect(completed.audit).toContainEqual(expect.objectContaining({
      action: "transition", project_id: id, details: { from: 5, to: 9, without_supervision: true },
    }));
    expect(completed.notifications).toContainEqual(expect.objectContaining({
      event: "project_completed", project_id: id,
    }));
    await supervisor.goto(path);
    await expect(supervisor.getByText("المشروع غير متاح", { exact: true })).toBeVisible();
  });
});
