import { timingSafeEqual } from "node:crypto";

function constantTimeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function requireFacebookAdmin(req, env = process.env) {
  const expected = String(env.META_ADMIN_API_KEY || "");
  const supplied = String(req.headers["x-streetwise-admin-key"] || "");

  if (expected.length < 32) {
    const error = new Error("facebook_admin_api_not_configured");
    error.statusCode = 503;
    throw error;
  }

  if (!supplied || !constantTimeEqual(supplied, expected)) {
    const error = new Error("facebook_admin_authentication_required");
    error.statusCode = 401;
    throw error;
  }

  return true;
}
