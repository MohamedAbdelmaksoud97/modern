import { spawn } from "node:child_process";
import { createHash, randomBytes, scryptSync } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { once } from "node:events";
import {
  initializeFixtureDatabase,
  openFixtureDatabase,
} from "./sqlite-workflow-db.mjs";

const root = process.cwd();
const output = resolve(".local", "sqlite-workflow");
mkdirSync(output, { recursive: true });
const run = mkdtempSync(join(output, "run-"));
const source = [
  "app",
  "components",
  "lib",
  "public",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "components.json",
  "proxy.ts",
  "next.config.ts",
];
const hash = createHash("sha256");
function hashSource(path) {
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path).sort()) hashSource(join(path, name));
  } else {
    hash.update(path);
    hash.update(readFileSync(path));
  }
}
for (const path of [
  ...source,
  "scripts/sqlite-workflow-db.mjs",
  "scripts/run-sqlite-workflow.mjs",
])
  hashSource(path);
const snapshot = join(output, "app-" + hash.digest("hex").slice(0, 16));
const stamp = join(snapshot, ".verified-build");
mkdirSync(snapshot, { recursive: true });
const database = join(run, "workflow.sqlite");
const fixture = openFixtureDatabase(database);
initializeFixtureDatabase(
  fixture,
  "database/001-modern.sql",
  "database/007-portfolio-images.sql",
);
const manager = {
  email: "manager@modern.test",
  password: randomBytes(20).toString("base64url"),
};
const salt = randomBytes(16).toString("hex");
fixture
  .prepare(
    "INSERT INTO users(name,email,role,password_hash) VALUES(?,?,'manager',?)",
  )
  .run(
    "مدير الاختبار",
    manager.email,
    "scrypt$" +
      salt +
      "$" +
      scryptSync(manager.password, salt, 64).toString("hex"),
  );
fixture.close();
writeFileSync(join(run, "manager.json"), JSON.stringify(manager), {
  mode: 0o600,
});

for (const entry of source) {
  if (existsSync(stamp)) break;
  cpSync(join(root, entry), join(snapshot, entry), { recursive: true });
}
if (!existsSync(join(snapshot, "node_modules"))) {
  symlinkSync(
    join(root, "node_modules"),
    join(snapshot, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
}
cpSync(
  join(root, "scripts/sqlite-workflow-db.mjs"),
  join(snapshot, "lib/server/sqlite-workflow-db.mjs"),
);
const originalDb = readFileSync(join(root, "lib/server/db.ts"), "utf8");
const boundary = originalDb.indexOf("export async function withActor");
if (boundary < 0) throw new Error("Database boundary not found");
writeFileSync(
  join(snapshot, "lib/server/db.ts"),
  [
    'import type { Pool, PoolClient } from "pg";',
    'import type { User } from "@/lib/types";',
    'import { AppError } from "./rules";',
    'import { createSqlitePool } from "./sqlite-workflow-db.mjs";',
    "const globalPool = globalThis as typeof globalThis & { localWorkflowPool?: Pool };",
    "export const pool = globalPool.localWorkflowPool ??= createSqlitePool(process.env.SQLITE_WORKFLOW_DB) as unknown as Pool;",
    originalDb.slice(boundary),
  ].join("\n"),
);
// Keep the test server consistently on Node and avoid release-only cache behavior.
writeFileSync(
  join(snapshot, "next.config.ts"),
  readFileSync(join(root, "next.config.ts"), "utf8").replace(
    "turbopack: {",
    "turbopack: {\n    root: " + JSON.stringify(root) + ",",
  ),
);

const portFinder = createServer().listen(0, "127.0.0.1");
await once(portFinder, "listening");
const port = portFinder.address().port;
await new Promise((resolve) => portFinder.close(resolve));
const baseURL = "http://127.0.0.1:" + port;
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) =>
      !/SUPABASE|^WAHA|^CRON_SECRET|^APP_ORIGIN|^NODE_ENV|^BUILD_STANDALONE/.test(
        key,
      ),
  ),
);
Object.assign(env, {
  SQLITE_WORKFLOW_DB: database,
  SQLITE_WORKFLOW_RUN: run,
  PLAYWRIGHT_BASE_URL: baseURL,
  NEXT_TELEMETRY_DISABLED: "1",
});
console.log("SQLite workflow artifacts:", run);
const nextBin = join(root, "node_modules/next/dist/bin/next");
if (!existsSync(stamp)) {
  const build = spawn(process.execPath, [nextBin, "build"], {
    cwd: snapshot,
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  const [code] = await once(build, "exit");
  if (code !== 0) throw new Error("SQLite workflow build failed");
  writeFileSync(stamp, "");
}
const dev = spawn(
  process.execPath,
  [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)],
  {
    cwd: snapshot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);
let devLog = "";
for (const stream of [dev.stdout, dev.stderr])
  stream.on("data", (chunk) => {
    devLog += chunk;
    if (/API failure|⨯|Error:/.test(String(chunk))) process.stderr.write(chunk);
  });
try {
  let ready = false;
  for (let attempt = 0; attempt < 90 && dev.exitCode === null; attempt++) {
    try {
      const response = await fetch(baseURL + "/api/health", {
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("SQLite test web server failed to start");
  const cli = join(root, "node_modules/@playwright/test/cli.js");
  const test = spawn(
    process.execPath,
    [
      cli,
      "test",
      "--config",
      "tests/sqlite/playwright.config.ts",
      ...process.argv.slice(2),
    ],
    { cwd: root, env, stdio: "inherit", windowsHide: true },
  );
  const [status] = await once(test, "exit");
  process.exitCode = status ?? 1;
} finally {
  writeFileSync(join(run, "next.log"), devLog);
  dev.kill();
}
