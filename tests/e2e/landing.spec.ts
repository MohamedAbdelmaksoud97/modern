import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/public", (route) =>
    route.fulfill({ json: { portfolio: [] } }),
  );
});

test("Arabic landing displays the supplied office content and eleven facades", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "مكتب مودرن للاستشارات الهندسية",
  );
  await expect(page.locator("#work article")).toHaveCount(11);
  await expect(
    page.getByRole("heading", { name: "واجهة مقام", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('a[href="https://wa.me/96551764654"]').first(),
  ).toBeVisible();
});

test("language and theme switches update the site and persist", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "التبديل إلى الإنجليزية" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Modern Engineering Consultancy",
  );
  await expect(
    page.getByLabel("Project details", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enable dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByRole("heading", { name: "Maqam facade", exact: true }),
  ).toBeVisible();
});

test("consultation validates fields and sends the entered request", async ({
  page,
}) => {
  let payload: Record<string, string> | undefined;
  await page.route("**/api/inquiries", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "إرسال طلب الاستشارة", exact: true })
    .click();
  await expect(
    page.getByText("يرجى كتابة رقم هاتف صحيح مع رمز الدولة."),
  ).toBeVisible();
  expect(payload).toBeUndefined();
  await page.getByLabel("الاسم", { exact: true }).fill("عميل اختبار");
  await page.getByLabel("رقم الهاتف", { exact: true }).fill("+96555560000");
  await page.getByRole("combobox", { name: "الخدمة المطلوبة" }).click();
  await page
    .getByRole("option", {
      name: "تصميم الواجهات والتصميم المعماري",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("combobox", { name: "الخدمة المطلوبة" }),
  ).toContainText("تصميم الواجهات والتصميم المعماري");
  await page
    .getByLabel("نبذة عن المشروع", { exact: true })
    .fill("استفسار تجريبي عن تصميم منزل ومساحات عائلية.");
  await page
    .getByRole("button", { name: "إرسال طلب الاستشارة", exact: true })
    .click();
  await expect(page.getByText("وصلنا طلبك بنجاح")).toBeVisible();
  expect(payload).toMatchObject({
    name: "عميل اختبار",
    phone: "+96555560000",
    service: "تصميم الواجهات والتصميم المعماري",
    website: "",
  });
});

test("mobile navigation supports keyboard and a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const trigger = page.getByRole("button", { name: "فتح قائمة التنقل" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page
    .getByRole("navigation", { name: "قائمة التنقل", exact: true })
    .getByRole("link", { name: "خدماتنا" })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(/#services$/);
});

test("published portfolio displays real supplied entries and excludes drafts", async ({
  page,
}) => {
  const entry = {
    id: "test-published",
    title: "مشروع منشور للاختبار",
    category: "سكني",
    location: "موقع الاختبار",
    description: "وصف صادر من بيانات المعرض.",
    image_url: "/architecture-illustration.jpg",
    created_at: "2026-11-15",
  };
  await page.route("**/api/public", (route) =>
    route.fulfill({
      json: {
        portfolio: [
          entry,
          {
            ...entry,
            id: "test-draft",
            title: "مشروع مسودة للاختبار",
            published: false,
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator("#work article")).toHaveCount(12);
  await expect(page.getByRole("heading", { name: entry.title })).toBeVisible();
  await expect(page.locator("#work").getByText(entry.location, { exact: true })).toBeVisible();
  await expect(page.getByText("مشروع مسودة للاختبار")).toHaveCount(0);
});

test("supplied facade gallery filters by architectural style and survives API outages", async ({
  page,
}) => {
  await page.route("**/api/public", (route) =>
    route.fulfill({ status: 503, json: { error: "unavailable" } }),
  );
  await page.goto("/");
  await expect(page.locator("#work article")).toHaveCount(11);
  for (const [name, count] of [
    ["حديث", 4],
    ["نيو كلاسيك", 3],
    ["كلاسيكي وإسلامي", 4],
    ["جميع الأعمال", 11],
  ] as const) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.locator("#work article")).toHaveCount(count);
  }
  await expect(
    page.locator('a[href="mailto:MODERNCONKW@GMAIL.COM"]').first(),
  ).toBeVisible();
  await expect(
    page.locator('iframe[title="موقع مكتب مودرن في شرق، الكويت"]'),
  ).toHaveAttribute("loading", "lazy");
});
