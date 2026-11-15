import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import pg from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { User } from "../lib/types";
loadEnvConfig(process.cwd());
test("real Postgres RLS isolates clients, assignments, supervisors and immutable finance", async () => {
  const databaseUrl = new URL(process.env.SUPABASE_DB_URL!);
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
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const a = randomUUID(),
      b = randomUUID(),
      p1 = randomUUID(),
      p2 = randomUUID();
    const manager = randomUUID(),
      clientA = randomUUID(),
      clientB = randomUUID(),
      supervisor = randomUUID(),
      architect = randomUUID(),
      outsider = randomUUID(),
      futureCivil = randomUUID();
    await c.query(
      "INSERT INTO modern.clients(id,name,national_id,phone) VALUES($1,$2,$3,$4),($5,$6,$7,$8)",
      [a, "Isolation A", a, "00000000", b, "Isolation B", b, "00000000"],
    );
    for (const [uid, role, cid] of [
      [manager, "manager", null],
      [clientA, "client", a],
      [clientB, "client", b],
      [supervisor, "site_supervisor", null],
      [architect, "architect", null],
      [outsider, "architect", null],
      [futureCivil, "civil_engineer", null],
    ])
      await c.query(
        "INSERT INTO modern.users(id,name,email,role,client_id,password_hash,must_change_password) VALUES($1,$2,$3,$4,$5,$6,false)",
        [uid, role, uid, role, cid, "test-only-no-login"],
      );
    await c.query(
      `INSERT INTO modern.projects(id,name,client_id,location,stage,contract_value,visibility) VALUES($1,'Isolation A',$2,'test',1,100,'{"architecture":true,"payments":false}'),($3,'Isolation B',$4,'test',7,100,'{}')`,
      [p1, a, p2, b],
    );
    await c.query(
      "INSERT INTO modern.assignments(project_id,user_id,stage) VALUES($1,$2,7),($3,$2,7),($1,$4,1),($1,$5,2)",
      [p1, supervisor, p2, architect, futureCivil],
    );
    await c.query(
      "INSERT INTO modern.tasks(project_id,title,assigned_to) VALUES($1,'architect task',$2),($1,'civil task',$3)",
      [p1, architect, futureCivil],
    );
    for (const [pid, category] of [
      [p1, "architecture"],
      [p1, "civil"],
      [p2, "architecture"],
    ])
      await c.query(
        "INSERT INTO modern.documents(project_id,name,category,mime_type,size,content,uploaded_by) VALUES($1,'test.pdf',$2,'application/pdf',6,$3,$4)",
        [pid, category, Buffer.from("%PDF-1"), manager],
      );
    await c.query(
      "INSERT INTO modern.payments(project_id,amount,reference,paid_at) VALUES($1,99.999,'test',current_date)",
      [p1],
    );
    const actor = async (uid: string) => {
      await c.query("RESET ROLE");
      await c.query("SELECT set_config('modern.user_id',$1,true)", [uid]);
      await c.query("SET LOCAL ROLE modern_app");
    };
    const denied = async (sql: string, params: unknown[] = []) => {
      await c.query("SAVEPOINT denied");
      await assert.rejects(c.query(sql, params));
      await c.query("ROLLBACK TO SAVEPOINT denied");
    };
    await c.query("UPDATE modern.projects SET stage=0 WHERE id=$1", [p1]);
    await actor(architect);
    assert.equal((await c.query("SELECT id FROM modern.projects")).rowCount, 0);
    await c.query("RESET ROLE");
    await c.query("UPDATE modern.projects SET stage=1 WHERE id=$1", [p1]);
    await actor(futureCivil);
    assert.equal((await c.query("SELECT id FROM modern.projects")).rowCount, 0);
    assert.equal(
      (await c.query("SELECT id FROM modern.documents")).rowCount,
      0,
    );
    await actor(clientA);
    assert.deepEqual(
      (await c.query("SELECT id FROM modern.projects")).rows.map((r) => r.id),
      [p1],
    );
    assert.equal(
      (await c.query("SELECT id FROM modern.assignments")).rowCount,
      0,
    );
    assert.equal((await c.query("SELECT id FROM modern.audit")).rowCount, 0);
    assert.deepEqual(
      (await c.query("SELECT category FROM modern.documents")).rows.map(
        (r) => r.category,
      ),
      ["architecture"],
    );
    assert.equal((await c.query("SELECT * FROM modern.payments")).rowCount, 0);
    assert.equal(
      (
        await c.query(
          "UPDATE modern.projects SET name='unauthorized' WHERE id=$1 RETURNING id",
          [p1],
        )
      ).rowCount,
      0,
    );
    assert.equal(
      (await c.query("SELECT name FROM modern.projects WHERE id=$1", [p1]))
        .rows[0].name,
      "Isolation A",
    );
    await actor(clientB);
    assert.deepEqual(
      (await c.query("SELECT id FROM modern.projects")).rows.map((r) => r.id),
      [p2],
    );
    assert.equal(
      (await c.query("SELECT id FROM modern.documents")).rowCount,
      0,
    );
    await actor(supervisor);
    assert.deepEqual(
      (await c.query("SELECT id FROM modern.projects")).rows.map((r) => r.id),
      [p2],
    );
    assert.equal(
      (await c.query("SELECT category FROM modern.documents")).rows[0].category,
      "architecture",
    );
    await actor(outsider);
    assert.equal((await c.query("SELECT id FROM modern.projects")).rowCount, 0);
    assert.equal(
      (await c.query("SELECT id FROM modern.documents")).rowCount,
      0,
    );
    await actor(architect);
    assert.deepEqual(
      (await c.query("SELECT id FROM modern.projects")).rows.map((r) => r.id),
      [p1],
    );
    assert.deepEqual(
      (await c.query("SELECT assigned_to FROM modern.tasks")).rows.map(
        (r) => r.assigned_to,
      ),
      [architect],
    );
    assert.equal(
      (await c.query("SELECT id FROM modern.quotations")).rowCount,
      0,
    );
    await c.query("RESET ROLE");
    await c.query("UPDATE modern.users SET role='civil_engineer' WHERE id=$1", [
      architect,
    ]);
    await actor(architect);
    assert.equal((await c.query("SELECT id FROM modern.projects")).rowCount, 0);
    assert.equal(
      (await c.query("SELECT id FROM modern.documents")).rowCount,
      0,
    );
    await c.query("RESET ROLE");
    await c.query("UPDATE modern.users SET role='architect' WHERE id=$1", [
      architect,
    ]);
    await actor(manager);
    await denied("SELECT password_hash FROM modern.users");
    await denied(
      "INSERT INTO modern.payments(project_id,amount,reference,paid_at) VALUES($1,0.002,'over',current_date)",
      [p1],
    );
    await c.query(
      "INSERT INTO modern.payments(project_id,amount,reference,paid_at) VALUES($1,0.001,'last',current_date)",
      [p1],
    );
    await denied("UPDATE modern.payments SET notes=$1 WHERE project_id=$2", [
      "tampered",
      p1,
    ]);
    await c.query(
      "INSERT INTO modern.allocations(project_id,stage,percentage) VALUES($1,1,60)",
      [p1],
    );
    await denied(
      "INSERT INTO modern.allocations(project_id,stage,percentage) VALUES($1,2,41)",
      [p1],
    );
    await denied(
      "INSERT INTO modern.quotations(project_id,amount,version) VALUES($1,99,1)",
      [p1],
    );
    await c.query("RESET ROLE");
    await c.query("UPDATE modern.projects SET stage=2 WHERE id=$1", [p1]);
    await actor(futureCivil);
    assert.deepEqual(
      (await c.query("SELECT id FROM modern.projects")).rows.map((r) => r.id),
      [p1],
    );
    assert.deepEqual(
      (await c.query("SELECT assigned_to FROM modern.tasks")).rows.map(
        (r) => r.assigned_to,
      ),
      [futureCivil],
    );
    await actor(architect);
    assert.deepEqual(
      (await c.query("SELECT id FROM modern.projects")).rows.map((r) => r.id),
      [p1],
    );
    await c.query("RESET ROLE");
    await c.query("UPDATE modern.users SET active=false WHERE id=$1", [
      architect,
    ]);
    await actor(architect);
    assert.equal((await c.query("SELECT id FROM modern.projects")).rowCount, 0);
  } finally {
    await c.query("ROLLBACK");
    c.release();
    await pool.end();
  }
});
test("scrypt, forced rotation and secretary privilege boundaries", async () => {
  const { hashPassword, verifyPassword } = await import("../lib/server/auth");
  const { pool, withActor } = await import("../lib/server/db");
  const { command, getData } = await import("../lib/server/business");
  const uid = randomUUID();
  const fixtureFile = join(
    process.cwd(),
    ".local",
    "backend-regression-" + randomUUID() + ".json",
  );
  const { createFixtures, cleanupFixtures } = await import(
    "../scripts/e2e-fixtures.mjs"
  );
  let fixtureCreated = false;
  try {
    const hash = await hashPassword("Test-Password-9281");
    assert.equal(await verifyPassword("Test-Password-9281", hash), true);
    assert.equal(await verifyPassword("wrong", hash), false);
    await assert.rejects(hashPassword("short"));
    const user = (
      await pool.query(
        "INSERT INTO modern.users(id,name,email,role,password_hash) VALUES($1,'Isolation secretary',$2,'secretary',$3) RETURNING id,name,email,role,client_id,active,must_change_password",
        [uid, uid + "@invalid.example", hash],
      )
    ).rows[0];
    await assert.rejects(
      withActor(user, async () => true),
      { code: "PASSWORD_CHANGE_REQUIRED" },
    );
    await pool.query(
      "UPDATE modern.users SET must_change_password=false WHERE id=$1",
      [uid],
    );
    user.must_change_password = false;
    await pool.query("UPDATE modern.users SET role='accountant' WHERE id=$1", [
      uid,
    ]);
    await assert.rejects(
      withActor(user, async () => true),
      { status: 401 },
    );
    await pool.query("UPDATE modern.users SET role='secretary' WHERE id=$1", [
      uid,
    ]);
    const fixture = (await createFixtures({
      file: fixtureFile,
    })) as unknown as {
      prefix: string;
      users: Record<string, User & { username: string }>;
      projects: { main: { id: string } };
    };
    fixtureCreated = true;
    const secretary = {
      ...fixture.users.secretary,
      email: fixture.users.secretary.username,
    };
    const created = await command(secretary, {
      action: "create_project",
      name: fixture.prefix + " intake",
      client_id: fixture.users.client.client_id,
      location: "Test office",
    });
    assert.ok(created.id);
    assert.equal(
      (
        await command(secretary, {
          action: "create_quotation",
          project_id: fixture.projects.main.id,
          amount: "100.001",
          notes: "E2E secretary preparation",
        })
      ).ok,
      true,
    );
    assert.equal(
      (
        await command(secretary, {
          action: "set_allocations",
          project_id: fixture.projects.main.id,
          allocations: [
            { stage: 1, percentage: "1.001" },
            { stage: 2, percentage: "98.999" },
          ],
        })
      ).ok,
      true,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT sum(percentage)::text AS total FROM modern.allocations WHERE project_id=$1",
          [fixture.projects.main.id],
        )
      ).rows[0].total,
      "100.000",
    );
    await assert.rejects(
      command(secretary, {
        action: "create_payment",
        project_id: fixture.projects.main.id,
        amount: "1.001",
        reference: "forbidden",
        paid_at: "2026-11-15",
        notes: "",
      }),
      { status: 403 },
    );
    const officeManager = {
      ...fixture.users.manager,
      email: fixture.users.manager.username,
    };
    const projectId = fixture.projects.main.id;
    const version = async () =>
      Number(
        (
          await pool.query("SELECT version FROM modern.projects WHERE id=$1", [
            projectId,
          ])
        ).rows[0].version,
      );
    const addDocument = async (category: string, old = false) =>
      pool.query(
        "INSERT INTO modern.documents(project_id,name,category,mime_type,size,content,uploaded_by,created_at) VALUES($1,'correction.pdf',$2,'application/pdf',6,$3,$4,clock_timestamp()-CASE WHEN $5 THEN interval '1 day' ELSE interval '0 seconds' END)",
        [projectId, category, Buffer.from("%PDF-1"), officeManager.id, old],
      );
    await command(officeManager, {
      action: "assign",
      project_id: projectId,
      user_id: fixture.users.architect.id,
      stage: 1,
    });
    await addDocument("architecture", true);
    await pool.query("UPDATE modern.projects SET stage=5 WHERE id=$1", [
      projectId,
    ]);
    await command(officeManager, {
      action: "municipality_decision",
      project_id: projectId,
      decision: "rejected",
      return_stage: 1,
      reason: "E2E corrected architecture required",
    });
    await assert.rejects(
      command(officeManager, {
        action: "transition",
        project_id: projectId,
        version: await version(),
      }),
      { status: 400 },
    );
    await addDocument("architecture");
    assert.equal(
      (
        await command(officeManager, {
          action: "transition",
          project_id: projectId,
          version: await version(),
        })
      ).ok,
      true,
    );
    await command(officeManager, {
      action: "assign",
      project_id: projectId,
      user_id: fixture.users.site_supervisor.id,
      stage: 7,
    });
    await addDocument("site_reports", true);
    await pool.query(
      "INSERT INTO modern.reports(project_id,title,notes,visit_date,created_by,created_at) VALUES($1,'Old visit','old',current_date,$2,clock_timestamp()-interval '1 day')",
      [projectId, officeManager.id],
    );
    await pool.query("UPDATE modern.projects SET stage=8 WHERE id=$1", [
      projectId,
    ]);
    await command(officeManager, {
      action: "closure_decision",
      project_id: projectId,
      decision: "needs_correction",
      return_stage: 7,
      reason: "E2E new visit required",
    });
    await assert.rejects(
      command(officeManager, {
        action: "transition",
        project_id: projectId,
        version: await version(),
      }),
      { status: 400 },
    );
    await addDocument("site_reports");
    await assert.rejects(
      command(officeManager, {
        action: "transition",
        project_id: projectId,
        version: await version(),
      }),
      { status: 400 },
    );
    await command(officeManager, {
      action: "create_report",
      project_id: projectId,
      title: "New visit",
      notes: "Corrected",
      visit_date: "2026-11-15",
    });
    assert.equal(
      (
        await command(officeManager, {
          action: "transition",
          project_id: projectId,
          version: await version(),
        })
      ).ok,
      true,
    );
    assert.equal(
      (await getData(officeManager)).documents.filter(
        (d) => d.project_id === projectId,
      ).length,
      4,
    );
    const portalUser = {
      ...fixture.users.client,
      email: fixture.users.client.username,
    };
    const portalProject = (await getData(portalUser)).projects.find(
      (p) => p.id === projectId,
    );
    assert.equal("rework_started_at" in portalProject!, false);
    await assert.rejects(
      command(user, {
        action: "create_employee",
        name: "Forbidden manager",
        email: "forbidden@invalid.example",
        role: "manager",
        password: "Test-Password-9281",
      }),
      { status: 403 },
    );
    const manager = (
      await pool.query(
        "SELECT id FROM modern.users WHERE role='manager' LIMIT 1",
      )
    ).rows[0];
    await assert.rejects(
      command(user, {
        action: "reset_password",
        id: manager.id,
        password: "Test-Password-9281",
      }),
      { status: 403 },
    );
    await assert.rejects(
      command(user, { action: "update_user", id: uid, active: false }),
      { status: 403 },
    );
    await pool.query("UPDATE modern.users SET active=false WHERE id=$1", [uid]);
    await assert.rejects(
      withActor(user, async () => true),
      { status: 401 },
    );
  } finally {
    if (fixtureCreated) await cleanupFixtures(fixtureFile);
    await pool.query("DELETE FROM modern.sessions WHERE user_id=$1", [uid]);
    await pool.query("DELETE FROM modern.users WHERE id=$1", [uid]);
    await pool.end();
  }
});
