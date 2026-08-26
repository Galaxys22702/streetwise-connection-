import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyEsimGoWebhook } from "../src/providers/esimGoWebhook.js";

const rawBody = Buffer.from('{"iccid":"8944538532008160222","alertType":"Utilisation"}');
const key = "streetwise-esim-go-test-key";

function signature(encoding) {
  return createHmac("sha256", key).update(rawBody).digest(encoding);
}

test("accepts valid eSIM Go callback HMAC signatures", () => {
  const originalKey = process.env.ESIM_API_KEY;
  process.env.ESIM_API_KEY = key;

  try {
    assert.doesNotThrow(() => verifyEsimGoWebhook(rawBody, signature("hex")));
    assert.doesNotThrow(() => verifyEsimGoWebhook(rawBody, signature("base64")));
  } finally {
    if (originalKey === undefined) delete process.env.ESIM_API_KEY;
    else process.env.ESIM_API_KEY = originalKey;
  }
});

test("rejects altered callback payloads and malformed signatures", () => {
  const originalKey = process.env.ESIM_API_KEY;
  process.env.ESIM_API_KEY = key;

  try {
    assert.throws(
      () => verifyEsimGoWebhook(Buffer.from("{}"), signature("hex")),
      /esim_go_signature_invalid/
    );
    assert.throws(
      () => verifyEsimGoWebhook(rawBody, "not-a-signature"),
      /esim_go_signature_invalid/
    );
  } finally {
    if (originalKey === undefined) delete process.env.ESIM_API_KEY;
    else process.env.ESIM_API_KEY = originalKey;
  }
});
