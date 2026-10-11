import test from "node:test";
import assert from "node:assert/strict";
import { requireFacebookAdmin } from "../src/services/facebookAdminAuth.js";

const key = "a".repeat(40);

test("facebook admin API fails closed without a configured key", () => {
  assert.throws(
    () => requireFacebookAdmin({ headers: {} }, {}),
    /facebook_admin_api_not_configured/
  );
});

test("facebook admin API rejects an incorrect key", () => {
  assert.throws(
    () =>
      requireFacebookAdmin(
        { headers: { "x-streetwise-admin-key": "wrong" } },
        { META_ADMIN_API_KEY: key }
      ),
    /facebook_admin_authentication_required/
  );
});

test("facebook admin API accepts the exact configured key", () => {
  assert.equal(
    requireFacebookAdmin(
      { headers: { "x-streetwise-admin-key": key } },
      { META_ADMIN_API_KEY: key }
    ),
    true
  );
});
