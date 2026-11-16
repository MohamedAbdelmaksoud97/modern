import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The pinned WAHA build encrypts PostgreSQL traffic but its parser disables
// certificate verification. Fail closed if that vendor implementation changes.
export function enforcePostgresTls(source) {
  const insecure = /rejectUnauthorized\s*:\s*false/g;
  if ((source.match(insecure) || []).length !== 1)
    throw new Error(
      "WAHA PostgreSQL TLS implementation changed; review the pinned image.",
    );
  return source.replace(insecure, "rejectUnauthorized: true");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target =
    process.argv[2] || "/app/dist/core/storage/psql/PsqlConnectionConfig.js";
  writeFileSync(target, enforcePostgresTls(readFileSync(target, "utf8")));
}
