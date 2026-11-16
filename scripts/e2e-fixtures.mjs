import nextEnv from "@next/env";
import pg from "pg";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

nextEnv.loadEnvConfig(process.cwd());
const defaultFile = resolve(".local/e2e.json");
function connection() {
  const url = new URL(process.env.SUPABASE_DB_URL);
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
    url.searchParams.delete(key);
  return new pg.Pool({
    connectionString: url.toString(),
    max: 1,
    ssl: {
      rejectUnauthorized: true,
      ca:
        process.env.SUPABASE_DB_CA_PEM ??
        readFileSync(join(process.cwd(), "certs", "supabase-ca.crt"), "utf8"),
    },
  });
}
function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

/** Creates isolated, clearly marked test records. Never changes the bootstrap manager. */
export async function createFixtures({ file = defaultFile } = {}) {
  try {
    await readFile(file);
    throw new Error("Fixture manifest already exists; clean that run first.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const runId = randomUUID();
  const prefix = `E2E-${Date.now()}-${randomBytes(4).toString("hex")}`;
  const fixture = {
    version: 1,
    run_id: runId,
    prefix,
    created_at: new Date().toISOString(),
    users: {},
    clients: {},
    projects: {},
  };
  const pool = connection();
  const c = await pool.connect();
  let wroteManifest = false;
  try {
    await c.query("BEGIN");
    for (const key of ["client", "other_client"]) {
      const client = {
        id: randomUUID(),
        name: `${prefix} ${key}`,
        national_id: `${prefix}-${key === "client" ? "a" : "b"}`,
        phone: "0000000000",
      };
      await c.query(
        "INSERT INTO modern.clients(id,name,national_id,phone) VALUES($1,$2,$3,$4)",
        [client.id, client.name, client.national_id, client.phone],
      );
      await c.query(
        "INSERT INTO modern.notification_preferences(client_id,enabled) VALUES($1,false)",
        [client.id],
      );
      fixture.clients[key] = client;
    }
    const accounts = [
      "manager",
      "client",
      "other_client",
      "architect",
      "civil_engineer",
      "draftsman",
      "municipality_draftsman",
      "site_supervisor",
      "secretary",
      "accountant",
      "forced_rotation",
    ];
    for (const key of accounts) {
      const role =
        key === "other_client"
          ? "client"
          : key === "forced_rotation"
            ? "architect"
            : key;
      const client = role === "client" ? fixture.clients[key] : null;
      const account = {
        id: randomUUID(),
        name: `${prefix} ${key}`,
        username: client?.national_id ?? `${prefix}-${key}@invalid.example`,
        password: randomBytes(21).toString("base64url"),
        role,
        client_id: client?.id ?? null,
        active: true,
        must_change_password: key === "forced_rotation",
      };
      await c.query(
        "INSERT INTO modern.users(id,name,email,role,client_id,password_hash,must_change_password) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          account.id,
          account.name,
          account.username,
          account.role,
          account.client_id,
          passwordHash(account.password),
          account.must_change_password,
        ],
      );
      fixture.users[key] = account;
    }
    for (const [key, clientKey] of [
      ["main", "client"],
      ["other", "other_client"],
    ]) {
      const project = {
        id: randomUUID(),
        name: `${prefix} ${key}`,
        client_id: fixture.clients[clientKey].id,
        location: "E2E test only",
        stage: 0,
        version: 1,
      };
      await c.query(
        "INSERT INTO modern.projects(id,name,client_id,location) VALUES($1,$2,$3,$4)",
        [project.id, project.name, project.client_id, project.location],
      );
      fixture.projects[key] = project;
    }
    await mkdir(resolve(file, ".."), { recursive: true });
    // Write before commit so a failed write cannot leave untracked database records.
    await writeFile(file, JSON.stringify(fixture, null, 2), {
      mode: 0o600,
      flag: "wx",
    });
    wroteManifest = true;
    await c.query("COMMIT");
    return fixture;
  } catch (error) {
    await c.query("ROLLBACK");
    if (wroteManifest) await unlink(file).catch(() => {});
    throw error;
  } finally {
    c.release();
    await pool.end();
  }
}

/** Removes only this manifest's IDs and records carrying its unique run prefix. */
export async function cleanupFixtures(fixtureOrFile = defaultFile) {
  const file = typeof fixtureOrFile === "string" ? fixtureOrFile : null;
  const fixture = file
    ? JSON.parse(await readFile(file, "utf8"))
    : fixtureOrFile;
  if (fixture.version !== 1 || !/^E2E-\d{13}-[a-f0-9]{8}$/.test(fixture.prefix))
    throw new Error("Invalid E2E fixture manifest.");
  const ids = (values) =>
    Object.values(values).map((value) => {
      if (!/^[a-f0-9-]{36}$/.test(value.id))
        throw new Error("Invalid fixture ID.");
      return value.id;
    });
  const knownClients = ids(fixture.clients),
    knownUsers = ids(fixture.users),
    knownProjects = ids(fixture.projects);
  if (
    knownClients.length < 2 ||
    knownUsers.length < 10 ||
    knownProjects.length < 2
  )
    throw new Error("Incomplete E2E fixture manifest.");
  const pool = connection(),
    c = await pool.connect();
  const immutable = [
    "audit",
    "payments",
    "quotations",
    "reports",
    "documents",
    "portfolio_images",
  ];
  try {
    await c.query("BEGIN");
    await c.query("SET LOCAL lock_timeout='10s'");
    const pattern = fixture.prefix + "%";
    for (const [table, known] of [
      ["clients", knownClients],
      ["users", knownUsers],
      ["projects", knownProjects],
    ]) {
      const unrelated = await c.query(
        `SELECT id FROM modern.${table} WHERE id=ANY($1::uuid[]) AND name NOT LIKE $2 LIMIT 1`,
        [known, pattern],
      );
      if (unrelated.rowCount)
        throw new Error(
          "Manifest references an unrelated record; refusing cleanup.",
        );
    }
    const clients = (
      await c.query(
        "SELECT id FROM modern.clients WHERE id=ANY($1::uuid[]) OR name LIKE $2 OR national_id LIKE $2",
        [knownClients, pattern],
      )
    ).rows.map((row) => row.id);
    const users = (
      await c.query(
        "SELECT id FROM modern.users WHERE id=ANY($1::uuid[]) OR client_id=ANY($2::uuid[]) OR email LIKE $3 OR name LIKE $3",
        [knownUsers, clients, pattern],
      )
    ).rows.map((row) => row.id);
    const projects = (
      await c.query(
        "SELECT id FROM modern.projects WHERE id=ANY($1::uuid[]) OR client_id=ANY($2::uuid[]) OR name LIKE $3",
        [knownProjects, clients, pattern],
      )
    ).rows.map((row) => row.id);
    const foreignAudit = await c.query(
      "SELECT id FROM modern.audit WHERE actor_id=ANY($1::uuid[]) AND project_id IS NOT NULL AND NOT(project_id=ANY($2::uuid[])) LIMIT 1",
      [users, projects],
    );
    if (foreignAudit.rowCount)
      throw new Error(
        "Fixture user changed an unrelated project; refusing cleanup.",
      );
    // These DDL changes remain inside this transaction. Other writers wait for the
    // table locks; triggers are restored before commit and real history is untouched.
    for (const table of immutable)
      await c.query(`ALTER TABLE modern.${table} DISABLE TRIGGER USER`);
    await c.query("DELETE FROM modern.sessions WHERE user_id=ANY($1::uuid[])", [
      users,
    ]);
    await c.query(
      "DELETE FROM modern.notifications WHERE project_id=ANY($1::uuid[]) OR client_id=ANY($2::uuid[])",
      [projects, clients],
    );
    await c.query(
      "DELETE FROM modern.audit WHERE project_id=ANY($1::uuid[]) OR actor_id=ANY($2::uuid[]) OR (action=$3 AND details->>$4 IN (SELECT id::text FROM modern.inquiries WHERE name LIKE $5))",
      [projects, users, "inquiry_received", "inquiry_id", pattern],
    );
    await c.query(
      `DELETE FROM modern.drawing_revision_notes n USING modern.documents d
       WHERE n.document_id=d.id AND d.project_id=ANY($1::uuid[])`,
      [projects],
    );
    await c.query(
      "UPDATE modern.drawing_series SET published_revision=NULL WHERE project_id=ANY($1::uuid[])",
      [projects],
    );
    for (const table of [
      "documents",
      "drawing_series",
      "reports",
      "payments",
      "quotations",
      "allocations",
      "assignments",
      "tasks",
    ])
      await c.query(
        `DELETE FROM modern.${table} WHERE project_id=ANY($1::uuid[])`,
        [projects],
      );
    await c.query("DELETE FROM modern.portfolio WHERE title LIKE $1", [
      pattern,
    ]);
    await c.query(
      "DELETE FROM modern.portfolio_images WHERE uploaded_by=ANY($1::uuid[])",
      [users],
    );
    await c.query("DELETE FROM modern.projects WHERE id=ANY($1::uuid[])", [
      projects,
    ]);
    await c.query(
      "DELETE FROM modern.notification_preferences WHERE client_id=ANY($1::uuid[])",
      [clients],
    );
    await c.query("DELETE FROM modern.users WHERE id=ANY($1::uuid[])", [users]);
    await c.query("DELETE FROM modern.clients WHERE id=ANY($1::uuid[])", [
      clients,
    ]);
    await c.query("DELETE FROM modern.inquiries WHERE name LIKE $1", [pattern]);
    for (const table of immutable)
      await c.query(`ALTER TABLE modern.${table} ENABLE TRIGGER USER`);
    await c.query("COMMIT");
    if (file) await unlink(file);
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
    await pool.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const action = process.argv[2] ?? "create";
  if (action === "create") {
    await createFixtures();
    console.log("E2E fixture credentials: .local/e2e.json");
  } else if (action === "cleanup") {
    await cleanupFixtures();
    console.log("Scoped E2E fixtures removed.");
  } else throw new Error("Use create or cleanup.");
}
