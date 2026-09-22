import test from "node:test";
import assert from "node:assert/strict";
import { runFacebookOpsHeartbeat } from "../src/services/facebookOpsHeartbeat.js";

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    }
  };
}

test("heartbeat stays dormant without an admin key", async () => {
  const result = await runFacebookOpsHeartbeat({ adminKey: "" });
  assert.deepEqual(result, {
    state: "dormant",
    reason: "admin_key_not_configured"
  });
});

test("heartbeat reports authorization pending without calling the Page endpoint", async () => {
  const seen = [];
  const result = await runFacebookOpsHeartbeat({
    adminKey: "a".repeat(40),
    fetchImpl: async url => {
      seen.push(String(url));
      return response({
        enabled: false,
        writesEnabled: false,
        metadataWritesEnabled: false,
        pageIdConfigured: false,
        tokenConfigured: false
      });
    }
  });

  assert.equal(result.state, "awaiting_meta_authorization");
  assert.equal(seen.length, 1);
  assert.match(seen[0], /\/api\/admin\/facebook\/status$/);
});

test("heartbeat verifies live Page access when Meta is configured", async () => {
  const seen = [];
  const result = await runFacebookOpsHeartbeat({
    adminKey: "b".repeat(40),
    fetchImpl: async url => {
      seen.push(String(url));
      if (seen.length === 1) {
        return response({
          enabled: true,
          writesEnabled: false,
          metadataWritesEnabled: false,
          pageIdConfigured: true,
          tokenConfigured: true
        });
      }
      return response({ page: { id: "108798728689570", name: "Streetwise Connection" } });
    }
  });

  assert.equal(result.state, "meta_ready");
  assert.deepEqual(result.page, {
    id: "108798728689570",
    name: "Streetwise Connection"
  });
  assert.equal(seen.length, 2);
});

test("heartbeat does not expose provider response bodies on failures", async () => {
  await assert.rejects(
    () => runFacebookOpsHeartbeat({
      adminKey: "c".repeat(40),
      fetchImpl: async () => response({ error: "secret detail" }, 401)
    }),
    error => {
      assert.equal(error.message, "facebook_ops_request_failed");
      assert.equal(error.statusCode, 401);
      assert.equal(error.message.includes("secret detail"), false);
      return true;
    }
  );
});
