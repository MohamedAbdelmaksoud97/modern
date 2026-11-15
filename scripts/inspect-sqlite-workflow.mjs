import { DatabaseSync } from "node:sqlite";

const path = process.argv[2];
if (!path)
  throw new Error("Pass the workflow.sqlite path from the Playwright run.");
const db = new DatabaseSync(path, { readOnly: true });

try {
  const integrity = db.prepare("PRAGMA integrity_check").get().integrity_check;
  const count = (table) =>
    db.prepare("SELECT count(*) AS count FROM " + table).get().count;
  const project = db
    .prepare(
      `
    SELECT stage,status,municipality_decision,closure_decision,
      printf('%.3f',contract_value) AS contract,
      printf('%.3f',coalesce((SELECT sum(amount) FROM payments WHERE project_id=p.id),0)) AS paid,
      printf('%.3f',contract_value-coalesce((SELECT sum(amount) FROM payments WHERE project_id=p.id),0)) AS balance
    FROM projects p
  `,
    )
    .get();
  const transitions = db
    .prepare(
      `
    SELECT u.role AS operator,json_extract(a.details,'$.from') AS before,
      json_extract(a.details,'$.to') AS after
    FROM audit a JOIN users u ON u.id=a.actor_id WHERE a.action='transition'
    ORDER BY a.rowid
  `,
    )
    .all();
  const summary = {
    integrity,
    project,
    employeesCreatedFromDashboard: db
      .prepare(
        "SELECT count(*) AS count FROM audit WHERE action='create_employee'",
      )
      .get().count,
    passwordsChanged: db
      .prepare(
        "SELECT count(*) AS count FROM audit WHERE action='password_changed'",
      )
      .get().count,
    documents: count("documents"),
    siteVisits: count("reports"),
    auditEvents: count("audit"),
    whatsappJobs: count("notifications"),
    transitions,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (
    integrity !== "ok" ||
    project?.stage !== 9 ||
    project?.status !== "completed" ||
    summary.employeesCreatedFromDashboard !== 7 ||
    summary.passwordsChanged !== 9 ||
    summary.siteVisits !== 3 ||
    project?.balance !== "1000.100"
  ) {
    process.exitCode = 1;
  }
} finally {
  db.close();
}
