import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolClient } from "pg";
import {
  roles,
  visibilityLabels,
  type User,
  type PlatformData,
  type CommandResult,
  type Visibility,
} from "@/lib/types";
import { pool, withActor } from "./db";
import { hashPassword, userColumns } from "./auth";
import {
  AppError,
  checkAllocations,
  checkPayment,
  checkTransition,
  milli,
  money,
  stageRoles,
} from "./rules";
const text = z.string().trim().min(1).max(1000),
  id = z.string().uuid(),
  date = z.preprocess(
    (v) => (v === "" ? null : v),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
  ),
  notes = z.string().max(10000).optional().default("");
const office = (u: User) => {
  if (!["manager", "secretary"].includes(u.role))
    throw new AppError("ليس لديك صلاحية لهذا الإجراء", 403);
};
const manager = (u: User) => {
  if (u.role !== "manager") throw new AppError("هذا الإجراء للمدير فقط", 403);
};
const finance = (u: User, secretary = false) => {
  if (
    !["manager", "accountant", ...(secretary ? ["secretary"] : [])].includes(
      u.role,
    )
  )
    throw new AppError("هذا الإجراء للإدارة والمحاسبة", 403);
};
export async function audit(
  c: PoolClient,
  u: User,
  action: string,
  projectId: string | null,
  details: Record<string, unknown> = {},
) {
  const auditId = randomUUID();
  await c.query(
    "INSERT INTO modern.audit(id,actor_id,actor_name,action,project_id,details) VALUES($1,$2,$3,$4,$5,$6)",
    [auditId, u.id, u.name, action, projectId, JSON.stringify(details)],
  );
  return auditId;
}
export async function notify(
  c: PoolClient,
  projectId: string,
  event: string,
  dedup: string,
) {
  await c.query(
    "INSERT INTO modern.notifications(project_id,client_id,event,body,status,dedup_key) SELECT id,client_id,$2,'','queued',$3 FROM modern.projects WHERE id=$1 ON CONFLICT DO NOTHING",
    [projectId, event, dedup],
  );
}
async function lockProject(c: PoolClient, projectId: string) {
  const { rows } = await c.query(
    "SELECT * FROM modern.projects WHERE id=$1 FOR UPDATE",
    [projectId],
  );
  if (!rows[0]) throw new AppError("المشروع غير موجود أو غير مصرح", 404);
  return rows[0];
}
export async function getData(user: User): Promise<PlatformData> {
  return withActor(user, async (c) => {
    const projects = (
      await c.query(
        "SELECT p.*,modern.project_balance(p.id)::text AS balance FROM modern.projects p ORDER BY p.created_at DESC",
      )
    ).rows;
    const data = {
      user,
      projects,
      clients: (
        await c.query(
          "SELECT c.*,u.id AS user_id FROM modern.clients c LEFT JOIN modern.users u ON u.client_id=c.id ORDER BY c.created_at DESC",
        )
      ).rows,
      users: (
        await c.query(
          `SELECT ${userColumns} FROM modern.users u ORDER BY u.created_at DESC`,
        )
      ).rows,
      assignments: (
        await c.query(
          "SELECT a.*,u.name AS user_name FROM modern.assignments a LEFT JOIN modern.users u ON u.id=a.user_id",
        )
      ).rows,
      documents: (
        await c.query(
          "SELECT id,project_id,name,category,mime_type,size,created_at,uploaded_by,report_id FROM modern.documents ORDER BY created_at DESC",
        )
      ).rows,
      reports: (
        await c.query("SELECT * FROM modern.reports ORDER BY visit_date DESC")
      ).rows,
      quotations: (
        await c.query("SELECT * FROM modern.quotations ORDER BY version DESC")
      ).rows,
      allocations: (
        await c.query(
          "SELECT a.*,(a.percentage*p.contract_value/100)::numeric(14,3)::text AS amount FROM modern.allocations a JOIN modern.projects p ON p.id=a.project_id ORDER BY a.stage",
        )
      ).rows,
      payments: (
        await c.query("SELECT * FROM modern.payments ORDER BY paid_at DESC")
      ).rows,
      tasks: (
        await c.query("SELECT * FROM modern.tasks ORDER BY created_at DESC")
      ).rows,
      audit: (
        await c.query(
          "SELECT id,actor_name,action,project_id,details,created_at FROM modern.audit ORDER BY created_at DESC LIMIT 300",
        )
      ).rows,
      inquiries: (
        await c.query("SELECT * FROM modern.inquiries ORDER BY created_at DESC")
      ).rows,
      portfolio: (
        await c.query("SELECT * FROM modern.portfolio ORDER BY created_at DESC")
      ).rows,
      notifications: (
        await c.query(
          "SELECT id,project_id,client_id,event,body,status,attempts,last_error,created_at FROM modern.notifications ORDER BY created_at DESC LIMIT 200",
        )
      ).rows,
      notification_preferences: (
        await c.query("SELECT * FROM modern.notification_preferences")
      ).rows,
    } as PlatformData;
    if (user.role === "client") {
      for (const p of data.projects) {
        Reflect.deleteProperty(p, "rework_started_at");
        const v = p.visibility ?? {};
        if (!v.status) {
          delete p.stage;
          p.status = "";
          delete p.municipality_decision;
          delete p.closure_decision;
        }
        if (!v.notes) delete p.description;
        if (!v.quotation) delete p.contract_value;
        if (!v.balance) delete p.balance;
        p.due_date = null;
        delete p.municipality_decision;
        delete p.closure_decision;
      }
      for (const report of data.reports) {
        const v = data.projects.find(
          (p) => p.id === report.project_id,
        )?.visibility;
        if (!v?.site_notes) report.notes = "";
        report.created_by = "";
      }
      for (const doc of data.documents) doc.uploaded_by = "";
      data.users = [];
      data.assignments = [];
      data.audit = data.audit
        .filter(
          (a) =>
            a.action === "transition" &&
            data.projects.find((p) => p.id === a.project_id)?.visibility
              ?.history,
        )
        .map((a) => ({
          ...a,
          actor_name: "",
          details: { from: a.details.from, to: a.details.to },
        }));
      data.tasks = [];
      data.clients = [];
      data.inquiries = [];
      data.portfolio = [];
      data.notifications = [];
      data.notification_preferences = [];
    } else if (user.role === "accountant") {
      for (const p of data.projects) {
        delete p.description;
        delete p.visibility;
        delete p.municipality_decision;
        delete p.closure_decision;
      }
    } else if (!["manager", "secretary"].includes(user.role)) {
      for (const p of data.projects) {
        delete p.contract_value;
        delete p.balance;
        delete p.visibility;
      }
    }
    return JSON.parse(JSON.stringify(data));
  });
}
async function accountCommand(
  user: User,
  action: string,
  input: unknown,
): Promise<CommandResult> {
  if (
    [
      "create_client",
      "update_client",
      "create_employee",
      "reset_password",
    ].includes(action)
  )
    office(user);
  else manager(user);
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const fresh = await c.query(
      "SELECT active,must_change_password,role FROM modern.users WHERE id=$1 FOR SHARE",
      [user.id],
    );
    if (
      !fresh.rows[0]?.active ||
      fresh.rows[0].must_change_password ||
      fresh.rows[0].role !== user.role
    )
      throw new AppError("يرجى تسجيل الدخول مجدداً", 401);
    let result: CommandResult = { ok: true };
    if (action === "create_client") {
      const p = z
        .object({
          name: text,
          national_id: z.string().trim().min(4).max(30),
          phone: z.string().trim().min(6).max(30),
          email: z.union([z.email(), z.literal("")]).optional(),
          notes,
          password: z.string().min(12).max(128).optional(),
        })
        .parse(input);
      const password = p.password ?? randomBytes(15).toString("base64url");
      const hash = await hashPassword(password);
      const clientId = (
        await c.query(
          "INSERT INTO modern.clients(name,national_id,phone,email,notes) VALUES($1,$2,$3,$4,$5) RETURNING id",
          [p.name, p.national_id, p.phone, p.email || null, p.notes],
        )
      ).rows[0].id;
      const username = p.national_id;
      await c.query(
        "INSERT INTO modern.users(name,email,role,client_id,password_hash) VALUES($1,$2,'client',$3,$4)",
        [p.name, username, clientId, hash],
      );
      await c.query(
        "INSERT INTO modern.notification_preferences(client_id) VALUES($1)",
        [clientId],
      );
      await audit(c, user, action, null, { client_id: clientId });
      result = { ok: true, id: clientId, credentials: { username, password } };
    } else if (action === "create_employee") {
      const p = z
        .object({
          name: text,
          email: text,
          role: z.enum(roles).refine((v) => v !== "client"),
          password: z.string().min(12).max(128),
        })
        .parse(input);
      if (user.role === "secretary" && p.role === "manager")
        throw new AppError("إنشاء حساب مدير متاح للمدير فقط", 403);
      const hash = await hashPassword(p.password);
      const created = (
        await c.query(
          "INSERT INTO modern.users(name,email,role,password_hash) VALUES($1,$2,$3,$4) RETURNING id",
          [p.name, p.email.toLowerCase(), p.role, hash],
        )
      ).rows[0];
      await audit(c, user, action, null, { user_id: created.id, role: p.role });
      result = { ok: true, id: created.id };
    } else if (action === "update_client") {
      const p = z
        .object({
          id,
          name: text,
          national_id: z.string().trim().min(4).max(30),
          phone: z.string().trim().min(6).max(30),
          email: z.union([z.email(), z.literal("")]).optional(),
          notes,
        })
        .parse(input);
      const updated = await c.query(
        "UPDATE modern.clients SET name=$2,national_id=$3,phone=$4,email=$5,notes=$6 WHERE id=$1 RETURNING id",
        [p.id, p.name, p.national_id, p.phone, p.email || null, p.notes],
      );
      if (!updated.rowCount) throw new AppError("العميل غير موجود", 404);
      await c.query(
        "UPDATE modern.users SET name=$2,email=$3 WHERE client_id=$1",
        [p.id, p.name, p.national_id],
      );
      await audit(c, user, action, null, { client_id: p.id });
      result = { ok: true, id: p.id };
    } else if (action === "update_user") {
      const p = z
        .object({ id, active: z.boolean(), role: z.enum(roles).optional() })
        .parse(input);
      await c.query("SELECT pg_advisory_xact_lock(73749001)");
      const old = (
        await c.query("SELECT * FROM modern.users WHERE id=$1 FOR UPDATE", [
          p.id,
        ])
      ).rows[0];
      if (!old) throw new AppError("المستخدم غير موجود", 404);
      if (p.id === user.id && (!p.active || (p.role && p.role !== "manager")))
        throw new AppError("لا يمكنك تعطيل حسابك الإداري");
      if (p.role && (p.role === "client") !== (old.role === "client"))
        throw new AppError("لا يمكن تحويل حساب عميل إلى موظف أو العكس");
      if (
        old.role === "manager" &&
        (!p.active || (p.role && p.role !== "manager"))
      ) {
        const count = await c.query(
          "SELECT count(*) FROM modern.users WHERE role='manager' AND active",
        );
        if (Number(count.rows[0].count) < 2)
          throw new AppError("يلزم الاحتفاظ بمدير نشط");
      }
      await c.query(
        "UPDATE modern.users SET active=$2,role=coalesce($3,role) WHERE id=$1",
        [p.id, p.active, p.role],
      );
      await c.query("DELETE FROM modern.sessions WHERE user_id=$1", [p.id]);
      await audit(c, user, action, null, {
        user_id: p.id,
        active: p.active,
        role: p.role,
      });
    } else {
      const p = z
        .object({ id, password: z.string().min(12).max(128) })
        .parse(input);
      const target = (
        await c.query("SELECT role FROM modern.users WHERE id=$1 FOR UPDATE", [
          p.id,
        ])
      ).rows[0];
      if (!target) throw new AppError("المستخدم غير موجود", 404);
      if (user.role === "secretary" && target.role === "manager")
        throw new AppError(
          "إعادة تعيين كلمة مرور المدير متاحة للمدير فقط",
          403,
        );
      const hash = await hashPassword(p.password);
      const updated = await c.query(
        "UPDATE modern.users SET password_hash=$2,must_change_password=true WHERE id=$1 RETURNING id",
        [p.id, hash],
      );
      if (!updated.rowCount) throw new AppError("المستخدم غير موجود", 404);
      await c.query("DELETE FROM modern.sessions WHERE user_id=$1", [p.id]);
      await audit(c, user, action, null, { user_id: p.id });
    }
    await c.query("COMMIT");
    return result;
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
}
export async function command(
  user: User,
  raw: unknown,
): Promise<CommandResult> {
  const base = z.object({ action: text }).passthrough().parse(raw);
  const action = base.action;
  if (
    [
      "create_client",
      "update_client",
      "create_employee",
      "update_user",
      "reset_password",
    ].includes(action)
  )
    return accountCommand(user, action, base);
  if (user.role === "client")
    throw new AppError("ليس لديك صلاحية التعديل", 403);
  return withActor(user, async (c) => {
    let resultId: string | undefined;
    let projectId: string | null = null;
    let event: string | undefined;
    let details: Record<string, unknown> = {};
    switch (action) {
      case "create_project": {
        office(user);
        const p = z
          .object({
            name: text,
            client_id: id,
            location: text,
            description: notes,
            due_date: date,
          })
          .parse(base);
        // The SELECT policy looks up the project by ID. A same-statement
        // RETURNING clause cannot see the new row through that lookup yet.
        projectId = randomUUID();
        await c.query(
          "INSERT INTO modern.projects(id,name,client_id,location,description,due_date) VALUES($1,$2,$3,$4,$5,$6)",
          [
            projectId,
            p.name,
            p.client_id,
            p.location,
            p.description,
            p.due_date || null,
          ],
        );
        resultId = projectId;
        event = "project_created";
        break;
      }
      case "update_project": {
        office(user);
        const p = z
          .object({
            id,
            name: text,
            location: text,
            description: notes,
            due_date: date,
          })
          .parse(base);
        await lockProject(c, p.id);
        await c.query(
          "UPDATE modern.projects SET name=$2,location=$3,description=$4,due_date=$5,version=version+1 WHERE id=$1",
          [p.id, p.name, p.location, p.description, p.due_date || null],
        );
        projectId = p.id;
        break;
      }
      case "assign": {
        office(user);
        const p = z
          .object({
            project_id: id,
            user_id: id,
            stage: z.number().int().min(1).max(8),
          })
          .parse(base);
        await lockProject(c, p.project_id);
        const expected = stageRoles[p.stage];
        if (!expected) throw new AppError("لا يمكن تعيين موظف لهذه المرحلة");
        const target = (
          await c.query("SELECT role,active FROM modern.users WHERE id=$1", [
            p.user_id,
          ])
        ).rows[0];
        if (!target?.active || target.role !== expected)
          throw new AppError("تخصص الموظف لا يطابق المرحلة");
        await c.query(
          "INSERT INTO modern.assignments(project_id,user_id,stage) VALUES($1,$2,$3) ON CONFLICT(project_id,stage) DO UPDATE SET user_id=EXCLUDED.user_id",
          [p.project_id, p.user_id, p.stage],
        );
        projectId = p.project_id;
        details = { user_id: p.user_id, stage: p.stage };
        break;
      }
      case "transition": {
        const p = z
          .object({ project_id: id, version: z.number().int() })
          .parse(base);
        const project = await lockProject(c, p.project_id);
        if (project.version !== p.version)
          throw new AppError("تغير المشروع، حدّث الصفحة ثم أعد المحاولة", 409);
        const expectedRole = stageRoles[project.stage];
        const assignment = expectedRole
          ? (
              await c.query(
                "SELECT a.user_id FROM modern.assignments a JOIN modern.users u ON u.id=a.user_id AND u.active AND u.role=$3 WHERE a.project_id=$1 AND a.stage=$2",
                [p.project_id, project.stage, expectedRole],
              )
            ).rows[0]
          : null;
        const isStageOperator =
          assignment?.user_id === user.id && user.role === expectedRole;
        if (!["manager", "secretary"].includes(user.role) && !isStageOperator)
          throw new AppError("لا يمكنك إكمال هذه المرحلة", 403);
        const outputs = (
          await c.query(
            "SELECT d.category FROM modern.documents d JOIN modern.projects p ON p.id=d.project_id WHERE d.project_id=$1 AND (p.rework_started_at IS NULL OR d.created_at>=p.rework_started_at)",
            [p.project_id],
          )
        ).rows.map((r) => r.category as string);
        checkTransition(
          project.stage,
          outputs,
          !!assignment,
          project.municipality_decision,
          project.closure_decision,
        );
        if (project.stage === 7) {
          const reports = await c.query(
            "SELECT r.id FROM modern.reports r JOIN modern.projects p ON p.id=r.project_id WHERE r.project_id=$1 AND (p.rework_started_at IS NULL OR r.created_at>=p.rework_started_at) LIMIT 1",
            [p.project_id],
          );
          if (!reports.rowCount)
            throw new AppError("يلزم تسجيل تقرير زيارة إشراف");
        }
        await c.query(
          "UPDATE modern.projects SET stage=stage+1,version=version+1,status=CASE WHEN stage=8 THEN 'completed' ELSE 'active' END WHERE id=$1",
          [p.project_id],
        );
        projectId = p.project_id;
        details = { from: project.stage, to: project.stage + 1 };
        event = project.stage === 8 ? "project_completed" : "stage_changed";
        break;
      }
      case "municipality_decision":
      case "closure_decision": {
        office(user);
        const p = z
          .object({
            project_id: id,
            decision: z.enum(["approved", "rejected", "needs_correction"]),
            return_stage: z.number().int().optional(),
            reason: text,
          })
          .parse(base);
        const project = await lockProject(c, p.project_id);
        const municipal = action === "municipality_decision";
        if (project.stage !== (municipal ? 5 : 8))
          throw new AppError("المشروع ليس في مرحلة القرار المطلوبة");
        let stage = project.stage;
        if (p.decision !== "approved") {
          if (
            p.return_stage === undefined ||
            p.return_stage < 1 ||
            p.return_stage >= (municipal ? 5 : 8) ||
            (municipal ? false : p.return_stage < 7)
          )
            throw new AppError("حدد مرحلة إرجاع مناسبة");
          stage = p.return_stage;
        }
        const column = municipal ? "municipality_decision" : "closure_decision";
        await c.query(
          `UPDATE modern.projects SET ${column}=$2,stage=$3,rework_started_at=CASE WHEN $2<>'approved' THEN clock_timestamp() ELSE rework_started_at END,version=version+1 WHERE id=$1`,
          [p.project_id, p.decision, stage],
        );
        projectId = p.project_id;
        details = {
          decision: p.decision,
          reason: p.reason,
          return_stage: p.return_stage,
        };
        event = municipal ? "municipality_decision" : "stage_changed";
        break;
      }
      case "create_report": {
        const p = z
          .object({
            project_id: id,
            title: text,
            notes,
            visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          })
          .parse(base);
        const project = await lockProject(c, p.project_id);
        if (
          project.stage !== 7 ||
          !["manager", "site_supervisor"].includes(user.role)
        )
          throw new AppError(
            "التقارير متاحة لمهندس الإشراف أثناء الإشراف الميداني",
            403,
          );
        const created = (
          await c.query(
            "INSERT INTO modern.reports(project_id,title,notes,visit_date,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id",
            [p.project_id, p.title, p.notes, p.visit_date, user.id],
          )
        ).rows[0];
        projectId = p.project_id;
        resultId = created.id;
        event = "supervision_report";
        break;
      }
      case "create_quotation": {
        finance(user, true);
        const p = z
          .object({
            project_id: id,
            amount: z.union([z.string(), z.number()]),
            notes,
          })
          .parse(base);
        const project = await lockProject(c, p.project_id);
        const amount = money(milli(p.amount));
        const paid = (
          await c.query(
            "SELECT coalesce(sum(amount),0)::text AS total FROM modern.payments WHERE project_id=$1",
            [p.project_id],
          )
        ).rows[0].total;
        if (Number(amount) < Number(paid))
          throw new AppError("قيمة التعاقد أقل من المدفوع");
        const version = Number(
          (
            await c.query(
              "SELECT coalesce(max(version),0)+1 AS version FROM modern.quotations WHERE project_id=$1",
              [p.project_id],
            )
          ).rows[0].version,
        );
        resultId = (
          await c.query(
            "INSERT INTO modern.quotations(project_id,amount,notes,version) VALUES($1,$2,$3,$4) RETURNING id",
            [p.project_id, amount, p.notes, version],
          )
        ).rows[0].id;
        await c.query(
          "UPDATE modern.projects SET contract_value=$2,version=version+1 WHERE id=$1",
          [project.id, amount],
        );
        projectId = p.project_id;
        details = { amount, version };
        break;
      }
      case "set_allocations": {
        finance(user, true);
        const p = z
          .object({
            project_id: id,
            allocations: z
              .array(
                z.object({
                  stage: z.number().int().min(0).max(9),
                  percentage: z.union([z.string(), z.number()]),
                  due_date: date,
                }),
              )
              .max(10),
          })
          .parse(base);
        await lockProject(c, p.project_id);
        checkAllocations(p.allocations.map((a) => a.percentage));
        if (
          new Set(p.allocations.map((a) => a.stage)).size !==
          p.allocations.length
        )
          throw new AppError("مراحل الدفعات مكررة");
        await c.query("DELETE FROM modern.allocations WHERE project_id=$1", [
          p.project_id,
        ]);
        for (const a of p.allocations)
          await c.query(
            "INSERT INTO modern.allocations(project_id,stage,percentage,due_date) VALUES($1,$2,$3,$4)",
            [p.project_id, a.stage, a.percentage, a.due_date || null],
          );
        projectId = p.project_id;
        details = { allocations: p.allocations };
        break;
      }
      case "create_payment": {
        finance(user);
        const p = z
          .object({
            project_id: id,
            amount: z.union([z.string(), z.number()]),
            reference: text,
            paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            notes,
          })
          .parse(base);
        const project = await lockProject(c, p.project_id);
        const paid = (
          await c.query(
            "SELECT coalesce(sum(amount),0)::text AS total FROM modern.payments WHERE project_id=$1",
            [p.project_id],
          )
        ).rows[0].total;
        const amount = checkPayment(project.contract_value, paid, p.amount);
        resultId = (
          await c.query(
            "INSERT INTO modern.payments(project_id,amount,reference,paid_at,notes) VALUES($1,$2,$3,$4,$5) RETURNING id",
            [p.project_id, amount, p.reference, p.paid_at, p.notes],
          )
        ).rows[0].id;
        projectId = p.project_id;
        details = { amount, reference: p.reference };
        event = "payment_recorded";
        break;
      }
      case "set_visibility": {
        manager(user);
        const p = z
          .object({
            project_id: id,
            visibility: z.record(z.string(), z.boolean()),
          })
          .parse(base);
        if (Object.keys(p.visibility).some((k) => !(k in visibilityLabels)))
          throw new AppError("إعداد ظهور غير صالح");
        await lockProject(c, p.project_id);
        await c.query(
          "UPDATE modern.projects SET visibility=$2,version=version+1 WHERE id=$1",
          [p.project_id, JSON.stringify(p.visibility as Visibility)],
        );
        projectId = p.project_id;
        details = { visibility: p.visibility };
        break;
      }
      case "create_task": {
        office(user);
        const p = z
          .object({
            project_id: id,
            title: text,
            assigned_to: id,
            due_date: date,
          })
          .parse(base);
        await lockProject(c, p.project_id);
        const target = (
          await c.query(
            "SELECT id FROM modern.users WHERE id=$1 AND active AND role<>'client'",
            [p.assigned_to],
          )
        ).rows[0];
        if (!target) throw new AppError("الموظف غير موجود");
        const assignee = (
          await c.query(
            "SELECT id FROM modern.assignments WHERE project_id=$1 AND user_id=$2",
            [p.project_id, p.assigned_to],
          )
        ).rows[0];
        const targetRole = (
          await c.query("SELECT role FROM modern.users WHERE id=$1", [
            p.assigned_to,
          ])
        ).rows[0]?.role;
        if (
          !assignee &&
          !["manager", "secretary", "accountant"].includes(targetRole)
        )
          throw new AppError("يجب تعيين الموظف للمشروع أولاً");
        resultId = (
          await c.query(
            "INSERT INTO modern.tasks(project_id,title,assigned_to,due_date) VALUES($1,$2,$3,$4) RETURNING id",
            [p.project_id, p.title, p.assigned_to, p.due_date || null],
          )
        ).rows[0].id;
        projectId = p.project_id;
        break;
      }
      case "update_task": {
        const p = z
          .object({
            id,
            status: z.enum(["pending", "in_progress", "completed"]),
          })
          .parse(base);
        const task = (
          await c.query("SELECT * FROM modern.tasks WHERE id=$1 FOR UPDATE", [
            p.id,
          ])
        ).rows[0];
        if (!task) throw new AppError("المهمة غير موجودة", 404);
        if (
          !["manager", "secretary"].includes(user.role) &&
          task.assigned_to !== user.id
        )
          throw new AppError("المهمة غير مسندة إليك", 403);
        await c.query("UPDATE modern.tasks SET status=$2 WHERE id=$1", [
          p.id,
          p.status,
        ]);
        projectId = task.project_id;
        details = { task_id: p.id, status: p.status };
        break;
      }
      case "update_inquiry": {
        office(user);
        const p = z
          .object({ id, status: z.enum(["new", "contacted", "closed"]) })
          .parse(base);
        const updated = await c.query(
          "UPDATE modern.inquiries SET status=$2 WHERE id=$1 RETURNING id",
          [p.id, p.status],
        );
        if (!updated.rowCount) throw new AppError("الاستفسار غير موجود", 404);
        details = { inquiry_id: p.id, status: p.status };
        break;
      }
      case "save_portfolio": {
        manager(user);
        const p = z
          .object({
            id: id.optional(),
            title: text,
            category: text,
            location: text,
            description: notes,
            image_url: z
              .string()
              .max(2000)
              .refine(
                (v) =>
                  (v.startsWith("/") && !v.startsWith("//")) ||
                  /^https:\/\//.test(v),
              ),
            published: z.boolean(),
          })
          .parse(base);
        if (p.id) {
          const update = await c.query(
            "UPDATE modern.portfolio SET title=$2,category=$3,location=$4,description=$5,image_url=$6,published=$7 WHERE id=$1 RETURNING id",
            [
              p.id,
              p.title,
              p.category,
              p.location,
              p.description,
              p.image_url,
              p.published,
            ],
          );
          if (!update.rowCount) throw new AppError("العمل غير موجود", 404);
          resultId = p.id;
        } else
          resultId = (
            await c.query(
              "INSERT INTO modern.portfolio(title,category,location,description,image_url,published) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
              [
                p.title,
                p.category,
                p.location,
                p.description,
                p.image_url,
                p.published,
              ],
            )
          ).rows[0].id;
        break;
      }
      case "delete_portfolio": {
        manager(user);
        const p = z.object({ id }).parse(base);
        await c.query("DELETE FROM modern.portfolio WHERE id=$1", [p.id]);
        details = { portfolio_id: p.id };
        break;
      }
      default:
        throw new AppError("الإجراء غير معروف");
    }
    const auditId = await audit(c, user, action, projectId, details);
    if (event && projectId) await notify(c, projectId, event, auditId);
    return { ok: true, id: resultId };
  });
}
