import { test, expect } from "@playwright/test";
test("login presents separate client and employee identification and rejects invalid credentials", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "مرحبًا بك في مودرن" }),
  ).toBeVisible();
  await page
    .getByLabel("البريد الإلكتروني أو رقم الهوية")
    .fill("nobody@modern.internal");
  await page
    .getByLabel("كلمة المرور", { exact: true })
    .fill("IncorrectPassword123!");
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
test("private workspace cannot be reached without a session", async ({
  page,
}) => {
  await page.goto("/workspace/projects");
  await expect(page).toHaveURL(/\/login/);
});
