// node --test test/  (Node 23.6+ strips the TypeScript types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { fitScale, referenceFor, responsive, shapeOf } from "../src/shape.ts";

const cells = (n) => 72 * n - 8;

test("shapes follow the aspect ratio, as in the engine", () => {
  assert.equal(shapeOf(cells(2), cells(2)), "square");
  assert.equal(shapeOf(cells(4), cells(4)), "square");
  assert.equal(shapeOf(cells(6), cells(5)), "square");
  assert.equal(shapeOf(cells(3), cells(2)), "wide");
  assert.equal(shapeOf(cells(4), cells(2)), "wide");
  assert.equal(shapeOf(cells(2), cells(3)), "tall");
  assert.equal(shapeOf(cells(4), cells(5)), "tall");
  assert.equal(shapeOf(0, 0), "square");
});

test("the scale fits the reference without cropping", () => {
  assert.equal(fitScale(272, 272, [136, 136]), 2);
  assert.equal(fitScale(280, 136, [136, 136]), 1);
  assert.equal(fitScale(0, 100, [136, 136]), 1);
});

test("references fall back to square", () => {
  assert.deepEqual(referenceFor({ square: [1, 1], wide: [2, 1] }, "wide"), [2, 1]);
  assert.deepEqual(referenceFor({ square: [1, 1] }, "tall"), [1, 1]);
  assert.deepEqual(referenceFor([5, 5], "wide"), [5, 5]);
  assert.deepEqual(responsive(560, 272, { square: [136, 136], wide: [280, 136] }), {
    width: 560, height: 272, shape: "wide", scale: 2,
  });
});
