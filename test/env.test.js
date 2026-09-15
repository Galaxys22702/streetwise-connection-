import assert from "node:assert/strict";
import test from "node:test";
import { booleanEnv, integerEnv, validatedBooleanEnv } from "../src/config/env.js";

async function withEnv(name, value, work) {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try {
    return await work();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

test("booleanEnv treats true case-insensitively and everything else as false", async () => {
  await withEnv("TEST_BOOLEAN_FLAG", "TRUE", () => {
    assert.equal(booleanEnv("TEST_BOOLEAN_FLAG"), true);
  });
  await withEnv("TEST_BOOLEAN_FLAG", "false", () => {
    assert.equal(booleanEnv("TEST_BOOLEAN_FLAG"), false);
  });
  await withEnv("TEST_BOOLEAN_FLAG", "yes", () => {
    assert.equal(booleanEnv("TEST_BOOLEAN_FLAG"), false);
  });
});

test("validatedBooleanEnv rejects ambiguous values", async () => {
  await withEnv("TEST_BOOLEAN_FLAG", "TRUE", () => {
    assert.equal(validatedBooleanEnv("TEST_BOOLEAN_FLAG"), true);
  });
  await withEnv("TEST_BOOLEAN_FLAG", "nope", () => {
    assert.throws(() => validatedBooleanEnv("TEST_BOOLEAN_FLAG"), /must be either true or false/i);
  });
  await withEnv("TEST_BOOLEAN_FLAG", undefined, () => {
    assert.equal(validatedBooleanEnv("TEST_BOOLEAN_FLAG", true), true);
  });
});

test("integerEnv uses its fallback for unset or blank values", async () => {
  const options = { fallback: 10, min: 1, max: 100 };
  await withEnv("TEST_INTEGER_FLAG", undefined, () => {
    assert.equal(integerEnv("TEST_INTEGER_FLAG", options), 10);
  });
  await withEnv("TEST_INTEGER_FLAG", "   ", () => {
    assert.equal(integerEnv("TEST_INTEGER_FLAG", options), 10);
  });
  await withEnv("TEST_INTEGER_FLAG", "25", () => {
    assert.equal(integerEnv("TEST_INTEGER_FLAG", options), 25);
  });
});

test("integerEnv rejects non-integers and out-of-range values", async () => {
  const options = { fallback: 10, min: 1, max: 100 };
  for (const value of ["abc", "1.5", "0", "101"]) {
    await withEnv("TEST_INTEGER_FLAG", value, () => {
      assert.throws(
        () => integerEnv("TEST_INTEGER_FLAG", options),
        /must be an integer between 1 and 100/i
      );
    });
  }
});
