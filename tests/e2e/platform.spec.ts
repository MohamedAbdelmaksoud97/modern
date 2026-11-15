import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { readFileSync } from "node:fs";
type Account = { id: string; username: string; password: string; role: string };
type Fixtures = {
  prefix: string;
  users: Record<string, Account>;
  clients: Record<string, { id: string }>;
  projects: Record<string, { id: string }>;
};
const fixtures: Fixtures = JSON.parse(readFileSync(".local/e2e.json", "utf8"));
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF",
);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lm8AAAAASUVORK5CYII=",
  "base64",
);
async function login(page: Page, key = "manager") {
  const account = fixtures.users[key];
  await page.goto("/login");
  await page
    .getByLabel("البريد الإلكتروني أو رقم الهوية")
    .fill(account.username);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(account.password);
  const [response] = await Promise.all([
    page.waitForResponse((result) => result.url().endsWith("/api/auth/login") && result.request().method() === "POST"),
    page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click(),
  ]);
  expect(response.status(), "Fixture account login").toBe(200);
  await expect(page).toHaveURL(
    key === "forced_rotation"
      ? /change-password/
      : key.includes("client")
        ? /portal/
        : /workspace/,
  );
}
async function command(
  request: APIRequestContext,
  action: string,
  payload: Record<string, unknown> = {},
) {
  const response = await request.post("/api/commands", {
    data: { action, ...payload },
  });
  const result = await response.json();
  expect(response.status(), `${action}: ${JSON.stringify(result)}`).toBe(200);
  expect(result.ok).toBe(true);
  return result;
}
async function projectData(
  request: APIRequestContext,
  id = fixtures.projects.main.id,
) {
  const r = await request.get("/api/data");
  expect(r.status()).toBe(200);
  const data = await r.json();
  return {
    data,
    project: data.projects.find((p: { id: string }) => p.id === id),
  };
}
async function upload(
  request: APIRequestContext,
  projectId: string,
  category: string,
  reportId?: string,
) {
  const r = await request.post("/api/files", {
    multipart: {
      project_id: projectId,
      category,
      ...(reportId ? { report_id: reportId } : {}),
      file: {
        name: category === "site_photos" ? "visit.png" : "output.pdf",
        mimeType: category === "site_photos" ? "image/png" : "application/pdf",
        buffer: category === "site_photos" ? png : pdf,
      },
    },
  });
  expect(r.status(), await r.text()).toBe(200);
  return r.json();
}
test.describe.serial("Persistent office and client workflows", () => {
  test("first login requires rotation and preserves password whitespace", async ({
    page,
  }) => {
    await login(page, "forced_rotation");
    expect((await page.request.get("/api/data")).status()).toBe(403);
    const password = ` ${fixtures.users.forced_rotation.password} New `;
    await page
      .getByLabel("كلمة المرور الحالية")
      .fill(fixtures.users.forced_rotation.password);
    await page.getByLabel("كلمة المرور الجديدة").fill(password);
    await page
      .getByRole("button", { name: "حفظ كلمة المرور", exact: true })
      .click();
    await expect(page).toHaveURL(/workspace/);
    const old = await page.request.post("/api/auth/login", {
      data: {
        identifier: fixtures.users.forced_rotation.username,
        password: fixtures.users.forced_rotation.password,
      },
    });
    expect(old.status()).toBe(401);
    const current = await page.request.post("/api/auth/login", {
      data: { identifier: fixtures.users.forced_rotation.username, password },
    });
    expect(current.status()).toBe(200);
  });
  test("manager can create a client and project through the UI and switch language/theme", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/workspace/clients");
    await page.getByRole("button", { name: "عميل جديد", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("اسم العميل").fill(`${fixtures.prefix} UI client`);
    await dialog
      .getByLabel("رقم الهوية", { exact: true })
      .fill(fixtures.prefix);
    await dialog.getByLabel("رقم الهاتف الدولي").fill("+96555560000");
    await dialog.getByRole("button", { name: "حفظ", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "بيانات الدخول الجديدة" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "تم استلام البيانات" }).click();
    await expect(
      page.getByText(`${fixtures.prefix} UI client`, { exact: true }).first(),
    ).toBeVisible();
    await page.goto("/workspace/projects?new=1");
    await page
      .getByRole("dialog")
      .getByLabel("اسم المشروع")
      .fill(`${fixtures.prefix} UI project`);
    await page
      .getByRole("dialog")
      .getByRole("combobox", { name: "العميل", exact: true })
      .click();
    await page
      .getByRole("option", {
        name: `${fixtures.prefix} UI client`,
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("موقع المشروع")
      .fill("Kuwait test location");
    await page
      .getByRole("dialog")
      .getByLabel("وصف المشروع")
      .fill("E2E UI persistence test");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "حفظ", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.reload();
    await expect(
      page.getByRole("link", {
        name: `${fixtures.prefix} UI project`,
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Switch to English|التبديل إلى الإنجليزية/ })
      .click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(
      page.getByRole("heading", { name: "Projects", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation")
        .getByRole("link", { name: "Clients", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Dark mode|Enable dark mode/ })
      .click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
  test("workflow enforces outputs, role timing, municipality return and continuous supervision", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180000);
    await login(page);
    const req = page.request,
      id = fixtures.projects.main.id;
    for (const [stage, key] of [
      [1, "architect"],
      [2, "civil_engineer"],
      [3, "draftsman"],
      [4, "municipality_draftsman"],
      [7, "site_supervisor"],
    ] as const)
      await command(req, "assign", {
        project_id: id,
        user_id: fixtures.users[key].id,
        stage,
      });
    const contextOptions = { extraHTTPHeaders: test.info().project.use.extraHTTPHeaders };
    const civilContext = await browser.newContext(contextOptions);
    const civilPage = await civilContext.newPage();
    await login(civilPage, "civil_engineer");
    expect((await projectData(civilPage.request)).project).toBeUndefined();
    const supervisorContext = await browser.newContext(contextOptions);
    const supervisor = await supervisorContext.newPage();
    await login(supervisor, "site_supervisor");
    expect((await projectData(supervisor.request)).project).toBeUndefined();
    let p = (await projectData(req)).project;
    expect(
      (
        await req.post("/api/commands", {
          data: { action: "transition", project_id: id, version: p.version },
        })
      ).status(),
    ).toBe(400);
    await upload(req, id, "contract");
    await command(req, "transition", { project_id: id, version: p.version });
    p = (await projectData(req)).project;
    expect(p.stage).toBe(1);
    expect(
      (
        await req.post("/api/commands", {
          data: { action: "transition", project_id: id, version: p.version },
        })
      ).status(),
    ).toBe(400);
    await upload(req, id, "architecture");
    await command(req, "transition", { project_id: id, version: p.version });
    expect((await projectData(civilPage.request)).project.stage).toBe(2);
    for (const [stage, categories] of [
      [2, ["civil"]],
      [3, ["drawings_2d", "drawings_3d"]],
      [4, ["municipality"]],
    ] as const) {
      p = (await projectData(req)).project;
      expect(p.stage).toBe(stage);
      for (const cat of categories) await upload(req, id, cat);
      await command(req, "transition", { project_id: id, version: p.version });
    }
    p = (await projectData(req)).project;
    expect(p.stage).toBe(5);
    expect(
      (
        await req.post("/api/commands", {
          data: { action: "transition", project_id: id, version: p.version },
        })
      ).status(),
    ).toBe(400);
    await command(req, "municipality_decision", {
      project_id: id,
      decision: "rejected",
      return_stage: 2,
      reason: "E2E engineering corrections",
    });
    expect((await projectData(req)).project.stage).toBe(2);
    for (let stage = 2; stage < 5; stage++) {
      p = (await projectData(req)).project;
      for (const category of (
        {
          2: ["civil"],
          3: ["drawings_2d", "drawings_3d"],
          4: ["municipality"],
        } as Record<number, string[]>
      )[stage])
        await upload(req, id, category);
      await command(req, "transition", { project_id: id, version: p.version });
    }
    await command(req, "municipality_decision", {
      project_id: id,
      decision: "approved",
      reason: "E2E permit approved",
    });
    p = (await projectData(req)).project;
    await command(req, "transition", { project_id: id, version: p.version });
    await upload(req, id, "supervision_contract");
    p = (await projectData(req)).project;
    await command(req, "transition", { project_id: id, version: p.version });
    const supData = (await projectData(supervisor.request)).data;
    expect(
      supData.projects.some((p: { id: string }) => p.id === id),
    ).toBeTruthy();
    expect(
      supData.documents.some(
        (d: { category: string }) => d.category === "architecture",
      ),
    ).toBeTruthy();
    const previous = supData.documents.find(
      (d: { category: string }) => d.category === "architecture",
    );
    expect(
      (await supervisor.request.get(`/api/files/${previous.id}`)).status(),
    ).toBe(200);
    const denied = await supervisor.request.post("/api/files", {
      multipart: {
        project_id: id,
        category: "architecture",
        file: {
          name: "forbidden.pdf",
          mimeType: "application/pdf",
          buffer: pdf,
        },
      },
    });
    expect(denied.status()).toBeGreaterThanOrEqual(400);
    const report1 = await command(supervisor.request, "create_report", {
      project_id: id,
      title: `${fixtures.prefix} visit one`,
      notes: "E2E visit notes",
      visit_date: "2026-11-15",
    });
    await upload(supervisor.request, id, "site_photos", report1.id);
    await command(supervisor.request, "create_report", {
      project_id: id,
      title: `${fixtures.prefix} visit two`,
      notes: "E2E second visit",
      visit_date: "2026-11-16",
    });
    expect(
      (await projectData(supervisor.request)).data.reports.filter(
        (r: { project_id: string }) => r.project_id === id,
      ),
    ).toHaveLength(2);
    await upload(supervisor.request, id, "site_reports", report1.id);
    p = (await projectData(req)).project;
    await command(req, "transition", { project_id: id, version: p.version });
    await command(req, "closure_decision", {
      project_id: id,
      decision: "needs_correction",
      return_stage: 7,
      reason: "E2E return to supervision",
    });
    p = (await projectData(req)).project;
    expect(p.stage).toBe(7);
    const correctedReport = await command(supervisor.request, "create_report", {
      project_id: id,
      title: `${fixtures.prefix} correction visit`,
      notes: "E2E correction report",
      visit_date: "2026-11-17",
    });
    await upload(supervisor.request, id, "site_reports", correctedReport.id);
    await command(req, "transition", { project_id: id, version: p.version });
    await command(req, "closure_decision", {
      project_id: id,
      decision: "approved",
      reason: "E2E closure approved",
    });
    p = (await projectData(req)).project;
    await command(req, "transition", { project_id: id, version: p.version });
    expect((await projectData(req)).project.stage).toBe(9);
    await civilContext.close();
    await supervisorContext.close();
  });
  test("financial precision and independent client visibility persist without cross-client leaks", async ({
    page,
    browser,
  }) => {
    await login(page);
    const req = page.request,
      id = fixtures.projects.main.id;
    await command(req, "create_quotation", {
      project_id: id,
      amount: "1000.123",
      notes: "E2E fixed contract",
    });
    await command(req, "set_allocations", {
      project_id: id,
      allocations: [
        { stage: 1, percentage: "1.001" },
        { stage: 7, percentage: "98.999" },
      ],
    });
    await command(req, "create_payment", {
      project_id: id,
      amount: "200.001",
      reference: `${fixtures.prefix}-receipt`,
      paid_at: "2026-11-15",
      notes: "E2E",
    });
    expect(
      (
        await req.post("/api/commands", {
          data: {
            action: "create_payment",
            project_id: id,
            amount: "999.000",
            reference: "E2E overpayment",
            paid_at: "2026-11-15",
          },
        })
      ).status(),
    ).toBe(400);
    await command(req, "set_visibility", {
      project_id: id,
      visibility: {
        balance: true,
        quotation: false,
        payments: false,
        status: false,
        history: false,
      },
    });
    const contextOptions = { extraHTTPHeaders: test.info().project.use.extraHTTPHeaders };
    const clientContext = await browser.newContext(contextOptions);
    const client = await clientContext.newPage();
    await login(client, "client");
    const cp = (await projectData(client.request)).project;
    expect(cp.contract_value).toBeUndefined();
    expect(cp.stage).toBeUndefined();
    expect(cp.balance).toBe("800.122");
    expect((await projectData(client.request)).data.payments).toHaveLength(0);
    expect((await projectData(client.request)).data.documents).toHaveLength(0);
    await client.goto(`/portal/projects/${id}`);
    await client.getByRole("tab", { name: "المالية", exact: true }).click();
    await expect(
      client.getByText("المبلغ المتبقي", { exact: true }),
    ).toBeVisible();
    await expect(client.getByText("٨٠٠٫١٢٢", { exact: false })).toBeVisible();
    expect(
      (
        await client.request.post("/api/commands", {
          data: { action: "create_project", name: "Forbidden" },
        })
      ).status(),
    ).toBe(403);
    const other = await browser.newContext(contextOptions),
      otherPage = await other.newPage();
    await login(otherPage, "other_client");
    expect((await projectData(otherPage.request)).project).toBeUndefined();
    const doc = (await projectData(req)).data.documents.find(
      (d: { project_id: string }) => d.project_id === id,
    );
    expect((await otherPage.request.get(`/api/files/${doc.id}`)).status()).toBe(
      404,
    );
    await command(req, "set_visibility", {
      project_id: id,
      visibility: {
        status: true,
        history: true,
        architecture: true,
        download: false,
        balance: true,
        site_reports: true,
        site_notes: false,
      },
    });
    const shared = (await projectData(client.request)).data;
    expect(
      shared.audit.filter((a: { project_id: string }) => a.project_id === id)
        .length,
    ).toBeGreaterThan(0);
    expect(
      shared.reports.every((r: { notes: string }) => r.notes === ""),
    ).toBeTruthy();
    expect(
      (await client.request.get(`/api/files/${doc.id}?download=1`)).status(),
    ).toBe(403);
    await clientContext.close();
    await other.close();
  });
  test("portfolio uploads publish publicly and real consultation inquiries reach CRM", async ({
    page,
  }) => {
    await login(page);
    const uploadResponse = await page.request.post("/api/portfolio-images", {
      multipart: {
        file: { name: "portfolio.png", mimeType: "image/png", buffer: png },
      },
    });
    expect(uploadResponse.status()).toBe(200);
    const image = await uploadResponse.json();
    const item = await command(page.request, "save_portfolio", {
      title: `${fixtures.prefix} portfolio`,
      category: "E2E",
      location: "E2E location",
      description: "E2E real API publication",
      image_url: image.url,
      published: false,
    });
    const publicBefore = await (await page.request.get("/api/public")).json();
    expect(
      publicBefore.portfolio.some((p: { id: string }) => p.id === item.id),
    ).toBe(false);
    await command(page.request, "save_portfolio", {
      id: item.id,
      title: `${fixtures.prefix} portfolio`,
      category: "E2E",
      location: "E2E location",
      description: "E2E real API publication",
      image_url: image.url,
      published: true,
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: `${fixtures.prefix} portfolio`,
        exact: true,
      }),
    ).toBeVisible();
    const inquiry = await page.request.post("/api/inquiries", {
      data: {
        name: `${fixtures.prefix} inquiry`,
        phone: "+96555560000",
        service: "التصميم المعماري",
        message: "E2E consultation through the live API",
        website: "",
      },
    });
    expect(inquiry.status()).toBe(200);
    await page.goto("/workspace/inquiries");
    await expect(
      page.getByRole("heading", {
        name: `${fixtures.prefix} inquiry`,
        exact: true,
      }),
    ).toBeVisible();
  });
  test("all office screens work on mobile in both themes without page overflow", async ({
    page,
  }) => {
    await login(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 375, height: 812 });
    for (const route of [
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
    ]) {
      await page.goto(`/workspace/${route}`);
      await expect(page.locator("#workspace-main")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `overflow /workspace/${route}`,
      ).toBeTruthy();
    }
    await page
      .getByRole("button", { name: "الوضع الداكن", exact: true })
      .first()
      .click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page
      .getByRole("button", { name: "فتح القائمة", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(errors).toEqual([]);
  });
});
