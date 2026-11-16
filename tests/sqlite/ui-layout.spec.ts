import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { randomUUID, scryptSync } from "node:crypto";
import { openFixtureDatabase } from "../../scripts/sqlite-workflow-db.mjs";
import type { PlatformData } from "../../lib/types";

let fixture: PlatformData;
let officeCookies: Awaited<ReturnType<BrowserContext["cookies"]>>;
let clientCookies: typeof officeCookies;
const projectName =
  "مشروع تصميم فيلا سكنية وإشراف هندسي متكامل في مدينة الكويت";
const routes = [
  "",
  "projects",
  "clients",
  "tasks",
  "files",
  "finance",
  "municipality",
  "supervision",
  "team",
  "whatsapp",
  "inquiries",
  "portfolio",
  "audit",
  "settings",
  "projects/ui-project",
];

test.beforeAll(async ({ request }) => {
  // These accounts exist only in the runner's disposable SQLite database.
  const db = openFixtureDatabase(process.env.SQLITE_WORKFLOW_DB);
  const suffix = randomUUID();
  const password = "UI-layout-" + randomUUID();
  const hash =
    "scrypt$ui-layout$" + scryptSync(password, "ui-layout", 64).toString("hex");
  const clientId = randomUUID();
  db.prepare(
    "INSERT INTO clients(id,name,national_id,phone) VALUES(?,?,?,?)",
  ).run(clientId, "عميل اختبار الواجهة", suffix, "+96555560000");
  for (const role of ["manager", "client"]) {
    db.prepare(
      "INSERT INTO users(name,email,role,client_id,password_hash,must_change_password) VALUES(?,?,?,?,?,0)",
    ).run(
      "مراجع الواجهة",
      `${role}-${suffix}@modern.test`,
      role,
      role === "client" ? clientId : null,
      hash,
    );
  }
  db.close();
  for (const role of ["manager", "client"]) {
    const response = await request.post("/api/auth/login", {
      data: { identifier: `${role}-${suffix}@modern.test`, password },
    });
    expect(response.status()).toBe(200);
    const { cookies } = await request.storageState();
    if (role === "client") clientCookies = cookies;
    else {
      officeCookies = cookies;
      fixture = await (await request.get("/api/data")).json();
    }
  }
  const created = "2026-11-16T10:00:00Z";
  fixture.clients = [
    {
      id: clientId,
      name: "عميل مكتب مودرن للاستشارات الهندسية",
      national_id: "123456789012",
      phone: "+96555560000",
      email: "client.with.long.email@modern.test",
      notes: "",
      created_at: created,
    },
  ];
  fixture.projects = [
    {
      id: "ui-project",
      code: "MOD-2026-001",
      name: projectName,
      client_id: clientId,
      client_name: fixture.clients[0].name,
      location: "الكويت – شرق – شارع أحمد الجابر",
      description: "المتطلبات المعمارية والإنشائية والإشراف على التنفيذ.",
      stage: 7,
      status: "active",
      due_date: "2026-12-31",
      contract_value: "1234567.890",
      balance: "900000",
      visibility: {
        status: true,
        history: true,
        notes: true,
        quotation: true,
        payment_schedule: true,
        payments: true,
        balance: true,
        site_reports: true,
        architecture: true,
        download: true,
      },
      version: 1,
      created_at: created,
    },
  ];
  fixture.tasks = ["pending", "in_progress", "completed"].map(
    (status, index) => ({
      id: `ui-task-${index}`,
      project_id: "ui-project",
      title: "مراجعة المخططات المعمارية والإنشائية والتنسيق مع فريق الإشراف",
      assigned_to: fixture.user.id,
      due_date: "2026-12-20",
      status,
      created_at: created,
    }),
  );
  fixture.documents = [
    {
      id: "ui-document",
      project_id: "ui-project",
      name: "المخططات المعمارية والإنشائية المعتمدة لمشروع فيلا الكويت.pdf",
      category: "architecture",
      mime_type: "application/pdf",
      size: 102400,
      created_at: created,
      uploaded_by: fixture.user.id,
    },
  ];
  fixture.inquiries = [
    {
      id: "ui-inquiry",
      name: "استفسار عن تصميم فيلا سكنية",
      phone: "+96555560000",
      service: "التصميم المعماري",
      message: "نرغب في الاستفسار عن التصميم الهندسي والإشراف على التنفيذ.",
      status: "new",
      created_at: created,
    },
  ];
  fixture.audit = [
    {
      id: "ui-audit",
      actor_name: fixture.user.name,
      action: "create_project",
      project_id: "ui-project",
      details: {},
      created_at: created,
    },
  ];
});

test.beforeEach(async ({ context }) => {
  await context.addCookies(officeCookies);
  await context.route("**/api/data", (route) =>
    route.fulfill({ json: fixture }),
  );
});

async function preferences(
  page: Page,
  locale: "ar" | "en",
  theme: "light" | "dark",
) {
  await page.addInitScript(
    ({ locale, theme }) => {
      localStorage.setItem("modern_locale", locale);
      localStorage.setItem("modern_theme", theme);
    },
    { locale, theme },
  );
}

async function noPageOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
    page.url(),
  ).toBeLessThanOrEqual((page.viewportSize()?.width || 0) + 1);
}

for (const locale of ["ar", "en"] as const) {
  test(`${locale}: search text stays clear of its icon at mobile and desktop widths`, async ({
    page,
  }) => {
    await preferences(page, locale, "light");
    for (const width of [320, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const section of ["projects", "clients"]) {
        await page.goto(`/workspace/${section}`);
        const input = page.locator(
          `#${section === "projects" ? "project" : "client"}-search`,
        );
        await expect(input).toBeVisible();
        const spacing = await input.evaluate((el) => {
          const icon = el.parentElement!.querySelector("svg")!;
          const field = el.getBoundingClientRect();
          const bounds = icon.getBoundingClientRect();
          const style = getComputedStyle(el);
          return {
            padding: parseFloat(style.paddingInlineStart),
            required:
              (style.direction === "rtl"
                ? field.right - bounds.left
                : bounds.right - field.left) + 8,
          };
        });
        expect(spacing.padding).toBeGreaterThanOrEqual(spacing.required);
        await input.fill("لا توجد نتيجة مطابقة");
        await expect(page.locator("[data-slot=table-body]")).toHaveCount(0);
        await input.fill("");
        await expect(page.locator("[data-slot=table-body] tr")).toHaveCount(1);
        await noPageOverflow(page);
      }
    }
  });

  test(`${locale}: password visibility control has reserved text space`, async ({
    page,
  }) => {
    await preferences(page, locale, "light");
    await page.setViewportSize({ width: 320, height: 850 });
    await page.goto("/login");
    const password = page.locator('input[name="password"]');
    await expect(password).toBeVisible();
    await password.fill("a-long-password-for-layout-review");
    expect(
      await password.evaluate((el) =>
        parseFloat(getComputedStyle(el).paddingInlineEnd),
      ),
    ).toBeGreaterThanOrEqual(56);
    await page
      .getByRole("button", {
        name: locale === "ar" ? "إظهار كلمة المرور" : "Show password",
        exact: true,
      })
      .click();
    await expect(password).toHaveAttribute("type", "text");
    await noPageOverflow(page);
  });

  test(`${locale}: all office sections and project tabs fit phone, tablet and desktop`, async ({
    page,
  }) => {
    await preferences(page, locale, locale === "ar" ? "light" : "dark");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const section of routes) {
        await page.goto(`/workspace/${section}`);
        await expect(page.locator("#workspace-main h1")).toBeVisible();
        await noPageOverflow(page);
      }
      const tabs = page.getByRole("tab");
      for (let index = 0; index < (await tabs.count()); index++) {
        await tabs.nth(index).click();
        await expect(tabs.nth(index)).toHaveAttribute("aria-selected", "true");
        expect(
          (await tabs.nth(index).boundingBox())!.height,
        ).toBeGreaterThanOrEqual(48);
        await noPageOverflow(page);
      }
    }
    expect(errors).toEqual([]);
  });
}

test("mobile dialogs, navigation, keyboard scrolling and touch controls remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/workspace/projects?new=1");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(15);
  expect(bounds.width).toBeLessThanOrEqual(290);
  expect(bounds.height).toBeLessThanOrEqual(708);
  await dialog.getByLabel("اسم المشروع", { exact: true }).fill("مشروع تجريبي");
  await dialog
    .getByRole("button", { name: "إغلاق النافذة", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/new=1/);
  for (const button of await page
    .locator("[data-slot=button][data-size=icon]:visible")
    .all()) {
    const box = (await button.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(48);
    expect(box.height).toBeGreaterThanOrEqual(48);
  }
  await page.getByRole("button", { name: "فتح القائمة", exact: true }).click();
  const menu = page.getByRole("dialog");
  await expect(menu).toBeVisible();
  await menu
    .getByRole("link", { name: "الحساب والإعدادات", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "الحساب والإعدادات", exact: true }),
  ).toBeVisible();
  await page.goto("/workspace/projects");
  const table = page.locator('[data-slot="table-container"]');
  await expect(table).toHaveAttribute("role", "region");
  await table.focus();
  await expect(table).toBeFocused();
  await noPageOverflow(page);
});

test("save notifications do not block options inside the next dialog", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await context.route("**/api/commands", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.goto("/workspace/team");
  await page.getByRole("button", { name: "إضافة موظف", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("الاسم الكامل").fill("موظف اختبار الواجهة");
  await dialog.getByLabel("بريد الموظف").fill("employee@modern.test");
  await dialog
    .getByRole("combobox", { name: "الدور الوظيفي", exact: true })
    .click();
  await page.getByRole("option", { name: "مهندس معماري", exact: true }).click();
  await dialog
    .getByLabel("كلمة المرور الأولية", { exact: true })
    .fill("UI-layout-password-2026");
  await dialog.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.getByRole("button", { name: "إضافة موظف", exact: true }).click();
  await dialog
    .getByRole("combobox", { name: "الدور الوظيفي", exact: true })
    .click();
  await page
    .getByRole("option", { name: "رسام البلدية", exact: true })
    .click({ timeout: 5000 });
  await expect(
    dialog
      .getByRole("combobox", { name: "الدور الوظيفي", exact: true })
      .locator('[data-slot="select-value"]'),
  ).toHaveText("رسام البلدية");
});

test("long project options and finance forms stay readable on a narrow phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/workspace/finance");
  await page.getByRole("combobox", { name: "المشروع", exact: true }).click();
  const option = page.getByRole("option", {
    name: `MOD-2026-001 · ${projectName}`,
    exact: true,
  });
  await expect(option).toBeVisible();
  const optionSize = await option.evaluate((el) => ({
    width: el.clientWidth,
    scroll: el.scrollWidth,
  }));
  expect(optionSize.scroll).toBeLessThanOrEqual(optionSize.width + 1);
  await option.click();
  await page.getByRole("button", { name: "توزيع النسب", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (const date of await dialog.locator('input[type="date"]').all()) {
    expect((await date.boundingBox())!.width).toBeGreaterThanOrEqual(200);
  }
  expect(await dialog.evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(
    290,
  );
  await dialog
    .getByRole("button", { name: "إغلاق النافذة", exact: true })
    .click();
  await page.getByRole("button", { name: "تسجيل دفعة", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("المبلغ (د.ك)", { exact: true }),
  ).toBeVisible();
  await noPageOverflow(page);
});

test("Tajawal loads on the public site, login, workspace and client portal in both themes", async ({
  page,
  context,
}) => {
  for (const theme of ["light", "dark"] as const) {
    await preferences(page, "ar", theme);
    for (const path of [
      "/",
      "/login",
      "/workspace",
      "/portal/projects/ui-project",
    ]) {
      const portal = path.startsWith("/portal");
      await context.clearCookies();
      await context.addCookies(portal ? clientCookies : officeCookies);
      await context.unroute("**/api/data");
      await context.route("**/api/data", (route) =>
        route.fulfill({
          json: portal
            ? {
                ...fixture,
                user: {
                  ...fixture.user,
                  role: "client",
                  client_id: fixture.clients[0].id,
                },
              }
            : fixture,
        }),
      );
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page
          .locator("h1")
          .evaluate((el) => getComputedStyle(el).fontFamily),
      ).toContain("Tajawal");
      expect(
        await page.evaluate(() => document.fonts.check('16px "Tajawal"')),
      ).toBe(true);
      await expect(page.locator("html")).toHaveClass(
        theme === "dark" ? /dark/ : /^(?!.*\bdark\b)/,
      );
      await noPageOverflow(page);
    }
  }
});
