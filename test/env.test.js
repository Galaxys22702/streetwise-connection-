import assert from "node:assert/strict";
import test from "node:test";
import { booleanEnv, validatedBooleanEnv } from "../src/config/env.js";

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
