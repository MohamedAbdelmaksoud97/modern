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
  assert.throws(() => checkTransition(0, [], false, null, null, "secretary"));
  checkTransition(0, ["contract"], false, null, null, "secretary");
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
  assert.throws(() => checkTransition(1, [], true, null, null, "architect"));
  assert.throws(() =>
    checkTransition(1, ["architecture"], false, null, null, "secretary"),
  );
  assert.throws(() => checkTransition(5, [], true, "rejected", null, "secretary"));
  checkTransition(1, ["architecture"], true, null, null, "architect");
  assert.throws(() => checkTransition(8, [], true, null, null, "secretary"));
});
test("manager can deliver an unassigned stage with its required output", () => {
  assert.throws(() => checkTransition(1, [], false, null, null, "manager"));
  checkTransition(1, ["architecture"], false, null, null, "manager");
});
test("a 2D or 3D facade drawing satisfies the facade output requirement", () => {
  assert.throws(() => checkTransition(3, [], true, null, null, "draftsman"));
  checkTransition(3, ["drawings_2d"], true, null, null, "draftsman");
  checkTransition(3, ["drawings_3d"], true, null, null, "draftsman");
  checkTransition(3, ["drawings_2d", "drawings_3d"], true, null, null, "draftsman");
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
