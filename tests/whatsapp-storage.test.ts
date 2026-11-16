import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { enforcePostgresTls } from "../deployment/enforce-waha-postgres-tls.mjs";

test("WAHA database connections verify certificates after the guarded vendor patch", () => {
  const original = "module.exports = { ssl: { rejectUnauthorized: false } };";
  const context = {
    module: { exports: {} as { ssl?: { rejectUnauthorized: boolean } } },
  };
  runInNewContext(enforcePostgresTls(original), context);
  assert.equal(context.module.exports.ssl?.rejectUnauthorized, true);
});

test("an unexpected vendor TLS implementation fails closed", () => {
  for (const source of [
    "module.exports = {};",
    "rejectUnauthorized: false; rejectUnauthorized: false",
  ])
    assert.throws(() => enforcePostgresTls(source), /implementation changed/);
});
