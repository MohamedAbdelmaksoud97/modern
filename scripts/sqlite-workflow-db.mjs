// Playwright-only adapter. The runner installs it into an isolated source copy.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

const uuid =
  "lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-8'||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))";
const isoNow = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const moneyFields = new Set([
  "contract_value",
  "balance",
  "paid_total",
  "amount",
  "total",
  "percentage",
]);
const jsonFields = new Set(["visibility", "details", "templates", "events"]);
const boolFields = new Set([
  "active",
  "must_change_password",
  "published",
  "enabled",
  "ledger_open",
  "completed_without_supervision",
]);
const scoped = new Set([
  "clients",
  "users",
  "projects",
  "assignments",
  "documents",
  "drawing_series",
  "drawing_revision_notes",
  "reports",
  "quotations",
  "allocations",
  "payments",
  "tasks",
  "audit",
  "inquiries",
  "portfolio",
  "notifications",
  "notification_settings",
  "notification_preferences",
  "portfolio_images",
]);

function schemaSql(file) {
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) =>
      /^(CREATE (TABLE|INDEX)|INSERT INTO modern.notification_settings)/.test(
        line,
      ),
    )
    .map((line) =>
      line
        .replaceAll("modern.", "")
        .replaceAll("gen_random_uuid()::text", "(" + uuid + ")")
        .replaceAll("DEFAULT gen_random_uuid()", "DEFAULT (" + uuid + ")")
        .replaceAll("DEFAULT now()", "DEFAULT (" + isoNow + ")")
        .replace(/REFERENCES (\w+)(?![\w(])/g, "REFERENCES $1(id)"),
    )
    .join("\n");
}

const policies = {
  clients: "actor_role() IN ('manager','secretary','accountant')",
  users: "id=actor_id() OR actor_role() IN ('manager','secretary')",
  projects: "can_project(id)",
  assignments:
    "can_project(project_id) AND actor_role() NOT IN ('client','accountant')",
  documents:
    "can_project(project_id) AND (actor_role()<>'client' OR (visible(project_id,category) AND (drawing_id IS NULL OR EXISTS (SELECT 1 FROM main.drawing_series s WHERE s.id=drawing_id AND s.published_revision=revision_number)))) AND (actor_role()<>'accountant' OR category IN ('receipts','contract','supervision_contract'))",
  drawing_series:
    "can_project(project_id) AND actor_role()<>'accountant' AND (actor_role()<>'client' OR (published_revision IS NOT NULL AND visible(project_id,category)))",
  drawing_revision_notes:
    "actor_role() NOT IN ('client','accountant') AND EXISTS (SELECT 1 FROM scoped_documents d WHERE d.id=document_id)",
  reports:
    "can_project(project_id) AND actor_role()<>'accountant' AND (actor_role()<>'client' OR visible(project_id,'site_reports') OR visible(project_id,'site_notes'))",
  quotations:
    "can_project(project_id) AND (actor_role() IN ('manager','secretary','accountant') OR visible(project_id,'quotation'))",
  allocations:
    "can_project(project_id) AND (actor_role() IN ('manager','secretary','accountant') OR visible(project_id,'payment_schedule'))",
  payments:
    "can_project(project_id) AND (actor_role() IN ('manager','secretary','accountant') OR visible(project_id,'payments'))",
  tasks:
    "can_project(project_id) AND (actor_role() IN ('manager','secretary') OR assigned_to=actor_id())",
  audit:
    "actor_role()='manager' OR (actor_role()='secretary' AND project_id IS NOT NULL) OR (actor_role()='client' AND action='transition' AND can_project(project_id) AND visible(project_id,'history'))",
  inquiries: "actor_role() IN ('manager','secretary')",
};

function normalize(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (value == null) return [key, value];
      if (moneyFields.has(key)) return [key, Number(value).toFixed(3)];
      if (jsonFields.has(key)) return [key, JSON.parse(value)];
      if (boolFields.has(key)) return [key, Boolean(value)];
      return [key, value];
    }),
  );
}

export function openFixtureDatabase(path) {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  return db;
}

export function initializeFixtureDatabase(
  db,
  baseMigration,
  portfolioMigration,
) {
  for (const file of [baseMigration, portfolioMigration]) {
    for (const statement of schemaSql(file).split("\n")) {
      try {
        db.exec(statement);
      } catch (error) {
        throw new Error("SQLite fixture schema: " + statement.slice(0, 100), {
          cause: error,
        });
      }
    }
  }
  db.exec("ALTER TABLE projects ADD COLUMN rework_started_at TEXT;");
  db.exec("ALTER TABLE projects ADD COLUMN completed_without_supervision INTEGER NOT NULL DEFAULT 0;");
  db.exec("ALTER TABLE inquiries ADD COLUMN converted_project_id TEXT;");
  db.exec("ALTER TABLE inquiries ADD COLUMN converted_at TEXT;");
  db.exec(`
    CREATE TABLE drawing_series(
      id TEXT PRIMARY KEY DEFAULT (${uuid}), project_id TEXT NOT NULL REFERENCES projects(id),
      category TEXT NOT NULL, name TEXT NOT NULL, published_revision INTEGER
    );
    ALTER TABLE documents ADD COLUMN drawing_id TEXT REFERENCES drawing_series(id);
    ALTER TABLE documents ADD COLUMN revision_number INTEGER;
    CREATE UNIQUE INDEX drawing_revision_unique ON documents(drawing_id,revision_number);
    CREATE TABLE drawing_revision_notes(document_id TEXT PRIMARY KEY REFERENCES documents(id), body TEXT NOT NULL);
  `);
  for (const name of [
    "audit",
    "documents",
    "reports",
    "payments",
    "quotations",
  ]) {
    for (const operation of ["UPDATE", "DELETE"]) {
      db.exec(
        "CREATE TRIGGER immutable_" +
          name +
          "_" +
          operation +
          " BEFORE " +
          operation +
          " ON " +
          name +
          " BEGIN SELECT RAISE(ABORT,'immutable history'); END;",
      );
    }
  }
}

function translate(sql, actor) {
  return sql
    .replace(
      /\bFROM modern\.(\w+)|\bJOIN modern\.(\w+)/gi,
      (part, from, join) => {
        const table = from || join;
        if (!actor || !scoped.has(table) || /^DELETE\b/i.test(sql)) return part;
        return (from ? "FROM " : "JOIN ") + "scoped_" + table;
      },
    )
    .replace(/\bmodern\./g, "")
    .replace(/\s+FOR (UPDATE|SHARE)( OF [\w,]+)?\s*$/i, "")
    .replace(/::numeric\(\d+,\d+\)|::text|::int\b/g, "")
    .replace(
      /now\(\)\+interval '12 hours'/g,
      "strftime('%Y-%m-%dT%H:%M:%fZ','now','+12 hours')",
    )
    .replace(
      /now\(\)\+\$2\*interval '1 second'/g,
      "strftime('%Y-%m-%dT%H:%M:%fZ','now',printf('+%d seconds',$2))",
    )
    .replace(/\b(now|clock_timestamp)\(\)/gi, isoNow);
}

export function createSqlitePool(path) {
  if (!path) throw new Error("SQLite workflow fixture path is required");
  const db = openFixtureDatabase(path);
  let actor = null;
  let tail = Promise.resolve();
  const readProject = db.prepare("SELECT * FROM projects WHERE id=?");
  const assigned = db.prepare(
    "SELECT 1 FROM assignments WHERE project_id=? AND user_id=? AND stage=?",
  );
  const paid = db.prepare(
    "SELECT coalesce(sum(amount),0) AS total FROM payments WHERE project_id=?",
  );
  const engineeringStages = {
    architect: 1,
    civil_engineer: 2,
    draftsman: 3,
    municipality_draftsman: 4,
    site_supervisor: 7,
  };
  function canProject(project) {
    if (!project || !actor) return false;
    if (["manager", "secretary", "accountant"].includes(actor.role))
      return true;
    if (actor.role === "client") return actor.client_id === project.client_id;
    const stage = engineeringStages[actor.role];
    return (
      stage != null &&
      stage <= project.stage &&
      (stage !== 7 || !project.completed_without_supervision) &&
      !!assigned.get(project.id, actor.id, stage)
    );
  }
  function visible(project, key) {
    return canProject(project) && JSON.parse(project.visibility)[key] === true;
  }
  db.function("actor_id", () => actor?.id ?? null);
  db.function("actor_role", () => actor?.role ?? null);
  db.function("can_project", (id) => Number(canProject(readProject.get(id))));
  db.function("visible", (id, key) =>
    Number(visible(readProject.get(id), key)),
  );
  db.function("ledger_is_open", () => 0);
  db.function("project_paid", (id) => paid.get(id).total);
  db.function("project_balance", (id) => {
    const project = readProject.get(id);
    if (
      !canProject(project) ||
      (actor.role === "client" && !visible(project, "balance"))
    )
      return null;
    return Number((project.contract_value - paid.get(id).total).toFixed(3));
  });
  for (const table of scoped) {
    db.exec(
      "CREATE TEMP VIEW scoped_" +
        table +
        " AS SELECT * FROM main." +
        table +
        " WHERE " +
        (policies[table] ?? "actor_role()='manager'"),
    );
  }

  async function connect() {
    let unlock;
    const previous = tail;
    tail = new Promise((resolve) => {
      unlock = resolve;
    });
    await previous;
    return {
      async query(sql, params = []) {
        if (
          /^SET LOCAL ROLE/i.test(sql) ||
          /^SELECT pg_advisory_xact_lock/i.test(sql)
        ) {
          return { rows: [], rowCount: 0 };
        }
        if (/^SELECT set_config/i.test(sql)) {
          actor = db
            .prepare(
              "SELECT id, role, client_id FROM users WHERE id=? AND active",
            )
            .get(params[0]);
          if (!actor) throw new Error("Fixture actor unavailable");
          return { rows: [], rowCount: 0 };
        }
        if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(sql)) {
          db.exec(sql);
          return { rows: [], rowCount: 0 };
        }
        const translated = translate(sql, actor);
        const statement = db.prepare(translated);
        const values = {};
        for (const [key, index] of translated.matchAll(/\$(\d+)/g)) {
          const value = params[Number(index) - 1];
          values[key] =
            value == null
              ? null
              : typeof value === "boolean"
                ? Number(value)
                : typeof value === "object" && !(value instanceof Uint8Array)
                  ? JSON.stringify(value)
                  : value;
        }
        const args = Object.keys(values).length ? [values] : [];
        try {
          if (statement.columns().length) {
            const rows = statement.all(...args).map(normalize);
            return { rows, rowCount: rows.length };
          }
          return { rows: [], rowCount: Number(statement.run(...args).changes) };
        } catch (error) {
          if (error.errcode === 2067 || error.errcode === 1555)
            error.code = "23505";
          if (error.errcode === 787) error.code = "23503";
          if (error.errcode === 275) error.code = "23514";
          throw error;
        }
      },
      release() {
        actor = null;
        unlock();
      },
    };
  }
  return {
    connect,
    async query(sql, args) {
      const client = await connect();
      try {
        return await client.query(sql, args);
      } finally {
        client.release();
      }
    },
  };
}
