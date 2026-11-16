import nextEnv from "@next/env";
import pg from "pg";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

nextEnv.loadEnvConfig(process.cwd());

const role = "modern_waha";
const databases = ["waha_modern", "waha_modern_default"];
const envPath = "deployment/waha.env";
const baseUrl = new URL(process.env.SUPABASE_DB_URL);
for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
  baseUrl.searchParams.delete(key);
if (baseUrl.hostname.includes("pooler") && baseUrl.port !== "5432")
  throw new Error("Use the session pooler on port 5432 for WAHA storage.");

const ssl = {
  rejectUnauthorized: true,
  ca:
    process.env.SUPABASE_DB_CA_PEM ??
    readFileSync("certs/supabase-ca.crt", "utf8"),
};
const storedEnv = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const values = Object.fromEntries(
  storedEnv
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const split = line.indexOf("=");
      return [line.slice(0, split), line.slice(split + 1)];
    }),
);
const savedUrl = values.WHATSAPP_SESSIONS_POSTGRESQL_URL
  ? new URL(values.WHATSAPP_SESSIONS_POSTGRESQL_URL)
  : null;
const password = savedUrl
  ? decodeURIComponent(savedUrl.password)
  : randomBytes(32).toString("hex");
if (!/^[a-f0-9]{64}$/.test(password))
  throw new Error(
    "Existing WAHA storage credentials need manual review; nothing was changed.",
  );

const storageUrl = new URL(baseUrl);
const username = decodeURIComponent(baseUrl.username);
storageUrl.username = baseUrl.hostname.includes("pooler")
  ? `${role}.${username.slice(username.indexOf(".") + 1)}`
  : role;
storageUrl.password = password;
storageUrl.pathname = `/${databases[0]}`;
storageUrl.searchParams.set("sslmode", "require");

function makeClient(url) {
  const parsed = new URL(url);
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
    parsed.searchParams.delete(key);
  return new pg.Client({
    connectionString: parsed.toString(),
    ssl,
    connectionTimeoutMillis: 10000,
  });
}

function saveEnv(updates) {
  const lines = storedEnv.split(/\r?\n/);
  for (const [key, value] of Object.entries(updates)) {
    const index = lines.findIndex((line) => line.startsWith(`${key}=`));
    if (index >= 0) lines[index] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }
  mkdirSync("deployment", { recursive: true });
  writeFileSync(
    envPath,
    lines.filter((line, index) => line || index < lines.length - 1).join("\n") +
      "\n",
    { mode: 0o600 },
  );
}

async function main() {
  const admin = makeClient(baseUrl);
  await admin.connect();
  try {
    const existing = await admin.query(
      "SELECT rolcanlogin,rolcreatedb,rolsuper,rolcreaterole,rolinherit,rolbypassrls FROM pg_roles WHERE rolname=$1",
      [role],
    );
    if (existing.rowCount && !savedUrl)
      throw new Error(
        "WAHA role already exists without saved credentials; nothing was changed.",
      );
    if (existing.rowCount) {
      const entry = existing.rows[0];
      if (
        !entry.rolcanlogin ||
        !entry.rolcreatedb ||
        entry.rolsuper ||
        entry.rolcreaterole ||
        entry.rolinherit ||
        entry.rolbypassrls
      )
        throw new Error(
          "Existing WAHA role has unexpected privileges; review it before continuing.",
        );
    }
    // Persist the generated password before provisioning so interrupted runs can resume.
    saveEnv({
      WHATSAPP_SESSIONS_POSTGRESQL_URL: storageUrl.toString(),
      WAHA_NAMESPACE: "modern",
      WAHA_SESSION_NAMESPACE: "modern",
      WAHA_ENGINE: "NOWEB",
    });
    if (!existing.rowCount) {
      await admin.query(
        `CREATE ROLE ${role} LOGIN PASSWORD '${password}' CREATEDB NOSUPERUSER NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 24`,
      );
    }
    // Reapply membership on resumed runs, including interruptions after CREATE ROLE.
    const current = await admin.query("SELECT quote_ident(current_user) AS name");
    await admin.query(`GRANT ${role} TO ${current.rows[0].name}`);
    for (const database of databases) {
      const result = await admin.query(
        "SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=$1",
        [database],
      );
      if (result.rowCount && result.rows[0].owner !== role)
        throw new Error(
          `Database ${database} is owned by another role; it was left unchanged.`,
        );
      if (!result.rowCount)
        await admin.query(
          `CREATE DATABASE ${database} OWNER ${role} TEMPLATE template0 CONNECTION LIMIT 24`,
        );
      await admin.query(`REVOKE ALL ON DATABASE ${database} FROM PUBLIC`);
    }
  } finally {
    await admin.end();
  }

  // Verify durability with two independent connections using only WAHA credentials.
  const table = `__modern_waha_probe_${randomBytes(6).toString("hex")}`;
  const marker = randomBytes(16).toString("hex");
  const writer = makeClient(storageUrl);
  await writer.connect();
  try {
    await writer.query(
      `CREATE TABLE ${table} (id integer PRIMARY KEY, payload jsonb NOT NULL)`,
    );
    await writer.query(`INSERT INTO ${table} VALUES (1,$1::jsonb)`, [
      JSON.stringify({ marker }),
    ]);
  } finally {
    await writer.end();
  }
  const reader = makeClient(storageUrl);
  await reader.connect();
  try {
    const result = await reader.query(
      `SELECT payload FROM ${table} WHERE id=1`,
    );
    if (result.rows[0]?.payload.marker !== marker)
      throw new Error("Storage reconnect verification failed.");
  } finally {
    await reader.query(`DROP TABLE ${table}`);
    await reader.end();
  }
  const sessionUrl = new URL(storageUrl);
  sessionUrl.pathname = `/${databases[1]}`;
  const session = makeClient(sessionUrl);
  await session.connect();
  try {
    await session.query("SELECT 1");
  } finally {
    await session.end();
  }
  const applicationUrl = new URL(storageUrl);
  applicationUrl.pathname = baseUrl.pathname;
  const restricted = makeClient(applicationUrl);
  await restricted.connect();
  try {
    const check = await restricted.query(
      "SELECT has_schema_privilege(current_user,'modern','USAGE') AS application_access, pg_has_role(current_user,'modern_app','MEMBER') AS application_role",
    );
    if (check.rows[0].application_access || check.rows[0].application_role)
      throw new Error("WAHA unexpectedly has access to application data.");
  } finally {
    await restricted.end();
  }
  console.log(
    "WAHA PostgreSQL storage provisioned. Reconnect persistence and office-data isolation verified. Credentials saved only in ignored deployment/waha.env.",
  );
}

main().catch((error) => {
  // SQL errors can contain credentials in their query field; never print raw errors.
  console.error(`WAHA storage setup failed (${error.code || error.name}).`);
  if (!error.code)
    console.error(
      error.message
        .replaceAll(password, "[redacted]")
        .replaceAll(storageUrl.toString(), "[redacted]"),
    );
  process.exitCode = 1;
});
