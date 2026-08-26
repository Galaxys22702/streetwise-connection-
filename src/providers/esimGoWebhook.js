import { createHmac, timingSafeEqual } from "node:crypto";

function apiKey() {
  return String(process.env.ESIM_API_KEY || "").trim();
}

function signatureBytes(signature) {
  const value = String(signature || "").trim();
  if (!value) return null;

  if (/^[a-f0-9]{64}$/i.test(value)) {
    return Buffer.from(value, "hex");
  }

  // The current guide documents hexadecimal signatures while the v2.5 callback
  // reference documents base64. Both are the same 32-byte HMAC digest.
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    return null;
  }

  const decoded = Buffer.from(value, "base64");
  return decoded.length === 32 ? decoded : null;
}

export function verifyEsimGoWebhook(rawBody, signature) {
  const key = apiKey();
  if (!key) {
    const error = new Error("esim_provider_not_configured");
    error.statusCode = 503;
    throw error;
  }

  const supplied = signatureBytes(signature);
  if (!supplied) {
    const error = new Error("esim_go_signature_invalid");
    error.statusCode = 401;
    throw error;
  }

  const expected = createHmac("sha256", key).update(rawBody).digest();
  if (!timingSafeEqual(expected, supplied)) {
    const error = new Error("esim_go_signature_invalid");
    error.statusCode = 401;
    throw error;
  }
}
