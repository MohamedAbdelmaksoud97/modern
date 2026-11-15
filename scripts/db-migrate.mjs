import nextEnv from "@next/env";
import pg from "pg";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { scryptSync, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
nextEnv.loadEnvConfig(process.cwd());
const databaseUrl = new URL(process.env.SUPABASE_DB_URL);
for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
  databaseUrl.searchParams.delete(key);
const pool = new pg.Pool({
  connectionString: databaseUrl.toString(),
  ssl: {
    rejectUnauthorized: true,
    ca:
      process.env.SUPABASE_DB_CA_PEM ??
      readFileSync("certs/supabase-ca.crt", "utf8"),
  },
  max: 1,
});
const connection = await pool.connect();
try {
  // Transaction pooling does not preserve session-level locks across transactions.
  // Hold a transaction-scoped lock for the entire ordered migration batch.
  await connection.query("BEGIN");
  try {
    await connection.query("SELECT pg_advisory_xact_lock(73749002)");
    await connection.query("CREATE SCHEMA IF NOT EXISTS modern");
    await connection.query(
      "CREATE TABLE IF NOT EXISTS modern.schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const names = (await readdir(new URL("../database/", import.meta.url)))
      .filter((n) => /^\d{3}-.+\.sql$/.test(n))
      .sort();
    for (const name of names) {
      if (
        (
          await connection.query(
            "SELECT 1 FROM modern.schema_migrations WHERE name=$1",
            [name],
          )
        ).rowCount
      )
        continue;
      const sql = (
        await readFile(new URL("../database/" + name, import.meta.url), "utf8")
      ).trim();
      if (!/^BEGIN;/i.test(sql) || !/COMMIT;$/i.test(sql))
        throw new Error(
          `Migration ${name} must have an outer BEGIN/COMMIT wrapper.`,
        );
      await connection.query(
        sql.replace(/^BEGIN;/i, "").replace(/COMMIT;$/i, ""),
      );
      await connection.query(
        "INSERT INTO modern.schema_migrations(name) VALUES($1)",
        [name],
      );
    }
    const count = await connection.query("select count(*) from modern.users");
    if (Number(count.rows[0].count) === 0) {
      const password = randomBytes(21).toString("base64url"),
        salt = randomBytes(16).toString("hex");
      const hash = scryptSync(password, salt, 64).toString("hex"),
        username = "manager@modern.internal";
      await connection.query(
        "insert into modern.users(name,email,role,password_hash) values($1,$2,'manager',$3)",
        ["مدير المكتب", username, "scrypt$" + salt + "$" + hash],
      );
      await mkdir(".local", { recursive: true });
      await writeFile(
        ".local/bootstrap.json",
        JSON.stringify({ username, password }, null, 2),
        { mode: 0o600, flag: "wx" },
      );
      console.log("Bootstrap credentials: .local/bootstrap.json");
    }
    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  }
  // One-time identity correction for the original bootstrap; preserve its password.
  let bootstrap;
  try {
    bootstrap = JSON.parse(await readFile(".local/bootstrap.json", "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (bootstrap?.username === "manager") {
    const c = connection;
    try {
      await c.query("BEGIN");
      const changed = await c.query(
        "UPDATE modern.users SET email='manager@modern.internal' WHERE email='manager' AND role='manager' RETURNING id,name",
      );
      if (changed.rowCount) {
        const account = changed.rows[0];
        await c.query(
          "INSERT INTO modern.audit(actor_id,actor_name,action) VALUES($1,$2,'bootstrap_identity_updated')",
          [account.id, account.name],
        );
      } else if (
        !(
          await c.query(
            "SELECT 1 FROM modern.users WHERE email='manager@modern.internal' AND role='manager'",
          )
        ).rowCount
      )
        throw new Error("Bootstrap identity was not found.");
      await c.query("COMMIT");
    } catch (error) {
      await c.query("ROLLBACK");
      throw error;
    }
    bootstrap.username = "manager@modern.internal";
    await writeFile(
      ".local/bootstrap.json",
      JSON.stringify(bootstrap, null, 2),
      { mode: 0o600 },
    );
    console.log("Bootstrap identity updated in .local/bootstrap.json");
  }
  console.log("modern schema migration verified");
} finally {
  connection.release();
  await pool.end();
}
