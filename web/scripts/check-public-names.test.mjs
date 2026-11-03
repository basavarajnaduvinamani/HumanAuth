import { test } from "node:test";
import assert from "node:assert/strict";
import { nameViolations } from "./check-public-names.mjs";

test("finds source, HTML-encoded and JS-escaped project names", () => {
  for (const value of ["Pushpa Priya N", "S Thriveni", "Sahana N", "Raj", "Navya Damodar", "Girisha D S", "Uday Kumar Reddy", "\\u0053ahana", "&#82;aj"])
    assert.ok(nameViolations(value).length, value);
});
test("allows owner credit, synthetic labels and unrelated words", () => {
  for (const value of ["Built by Basavaraj A Naduvinamani", "Sample speaker A", "Rajasthan", "camera guide", "original report unchanged"])
    assert.deepEqual(nameViolations(value), []);
});
