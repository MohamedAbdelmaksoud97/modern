import nextEnv from "@next/env";
import pg from "pg";
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
try {
  const result = await pool.query(
    "select table_schema, table_name from information_schema.tables where table_schema not in ('pg_catalog','information_schema') order by 1,2",
  );
  console.log(JSON.stringify(result.rows));
} finally {
  await pool.end();
}
