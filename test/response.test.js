import assert from "node:assert/strict";
import test from "node:test";
import { sendError } from "../src/http/response.js";

function response() {
  return {
    headers: {},
    statusCode: null,
    body: "",
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value) { this.body = value; }
  };
}

test("production 5xx responses hide internal exception text", () => {
  const res = response();
  const error = new Error("connect ECONNREFUSED postgres.internal:5432");
  sendError(res, error, { isProduction: true });

  assert.equal(res.statusCode, 500);
  assert.deepEqual(JSON.parse(res.body), { error: "request_failed" });
});

test("production 4xx responses expose only safe machine-readable codes", () => {
  const safe = response();
  const safeError = new Error("authentication_required");
  safeError.statusCode = 401;
  sendError(safe, safeError, { isProduction: true });
  assert.equal(safe.statusCode, 401);
  assert.deepEqual(JSON.parse(safe.body), { error: "authentication_required" });

  const unsafe = response();
  const unsafeError = new Error("Bad request: database host is db.internal");
  unsafeError.statusCode = 400;
  sendError(unsafe, unsafeError, { isProduction: true });
  assert.deepEqual(JSON.parse(unsafe.body), { error: "request_failed" });
});
