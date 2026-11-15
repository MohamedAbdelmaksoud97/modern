import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkAllocations,
  checkPayment,
  checkTransition,
  milli,
  fileDisposition,
} from "../lib/server/rules";
test("intake requires its contract before engineering starts", () => {
  assert.throws(() => checkTransition(0, [], false, null, null));
  checkTransition(0, ["contract"], false, null, null);
});
test("KWD precision and overpayment", () => {
  assert.equal(milli("1.001"), 1001);
  assert.throws(() => milli("1.0001"));
  assert.throws(() => checkPayment("100", "99.999", "0.002"));
  assert.equal(checkPayment("100", "99.999", "0.001"), "0.001");
});
test("aggregate allocations", () => {
  checkAllocations([33.333, 66.667]);
  assert.throws(() => checkAllocations([60, 41]));
  assert.throws(() => checkAllocations([-1]));
});
test("required outputs and decisions cannot be skipped", () => {
  assert.throws(() => checkTransition(1, [], true, null, null));
  assert.throws(() => checkTransition(1, ["architecture"], false, null, null));
  assert.throws(() => checkTransition(5, [], true, "rejected", null));
  checkTransition(1, ["architecture"], true, null, null);
  assert.throws(() => checkTransition(8, [], true, null, null));
});
test("three-place allocation decimals survive binary floating point", () => {
  checkAllocations([1.001, 98.999]);
  checkAllocations(["1.001", "98.999"]);
  assert.throws(() => checkAllocations(["1.0001"]));
});
test("attachment-only CAD requires download permission even without query", () => {
  assert.throws(() =>
    fileDisposition("application/acad", false, "client", false),
  );
  assert.throws(() =>
    fileDisposition("application/pdf", true, "client", false),
  );
  assert.equal(
    fileDisposition("application/pdf", false, "client", false),
    "inline",
  );
  assert.equal(
    fileDisposition("application/acad", false, "client", true),
    "attachment",
  );
  assert.equal(
    fileDisposition("application/acad", false, "architect", false),
    "attachment",
  );
});
