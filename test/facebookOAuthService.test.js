import test from "node:test";
import assert from "node:assert/strict";
import { createFacebookOAuthService } from "../src/services/facebookOAuthService.js";

const baseEnv = {
  META_OAUTH_ENABLED: "true",
  META_GRAPH_VERSION: "v26.0",
  META_PAGE_ID: "108798728689570",
  META_APP_ID: "123456789012345",
  META_APP_SECRET: "meta-app-secret-long-enough",
  META_LOGIN_CONFIG_ID: "987654321098765",
  META_OAUTH_REDIRECT_URI: "https://streetwise.example/api/admin/facebook/oauth/callback",
  META_OAUTH_STATE_SECRET: "state-secret-that-is-at-least-thirty-two-characters",
  META_TOKEN_ENCRYPTION_KEY: "22".repeat(32)
};

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(body);
    }
  };
}

test("OAuth authorization URL uses Meta Business Login configuration and signed state", () => {
  const service = createFacebookOAuthService({
    env: baseEnv,
    fetchImpl: async () => response({}),
    now: () => 1_790_000_000_000
  });

  const url = new URL(service.authorizationUrl());
  assert.equal(url.origin, "https://www.facebook.com");
  assert.equal(url.pathname, "/v26.0/dialog/oauth");
  assert.equal(url.searchParams.get("client_id"), baseEnv.META_APP_ID);
  assert.equal(url.searchParams.get("config_id"), baseEnv.META_LOGIN_CONFIG_ID);
  assert.equal(url.searchParams.get("redirect_uri"), baseEnv.META_OAUTH_REDIRECT_URI);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.has("client_secret"), false);
  assert.match(url.searchParams.get("state"), /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
});

test("OAuth refuses to start until token encryption is actually ready", () => {
  for (const tokenEncryptionKey of ["", "too-short"]) {
    const service = createFacebookOAuthService({
      env: {
        ...baseEnv,
        META_TOKEN_ENCRYPTION_KEY: tokenEncryptionKey
      },
      fetchImpl: async () => response({})
    });

    const status = service.status();
    assert.equal(status.tokenEncryptionKeyConfigured, false);
    assert.equal(status.configured, false);
    assert.throws(
      () => service.authorizationUrl(),
      /meta_oauth_not_configured/
    );
  }
});

test("OAuth refuses a redirect URI outside the dedicated Streetwise callback path", () => {
  const service = createFacebookOAuthService({
    env: {
      ...baseEnv,
      META_OAUTH_REDIRECT_URI: "https://streetwise.example/not-the-callback"
    },
    fetchImpl: async () => response({})
  });

  assert.throws(
    () => service.authorizationUrl(),
    /meta_oauth_redirect_uri_must_match_callback_path/
  );
});

test("OAuth callback exchanges the code, finds only the configured Page and stores its Page token", async () => {
  const saved = [];
  const seen = [];
  const service = createFacebookOAuthService({
    env: baseEnv,
    now: () => 1_790_000_000_000,
    saveConnection: async page => {
      saved.push(page);
      return page;
    },
    fetchImpl: async (url, options) => {
      const parsed = new URL(String(url));
      seen.push({ parsed, options });

      if (parsed.pathname.endsWith("/oauth/access_token") && !parsed.searchParams.has("grant_type")) {
        return response({ access_token: "EAA-short-user-token-that-is-long-enough" });
      }
      if (parsed.pathname.endsWith("/oauth/access_token") && parsed.searchParams.get("grant_type") === "fb_exchange_token") {
        return response({ access_token: "EAA-long-user-token-that-is-long-enough", expires_in: 5_000_000 });
      }
      if (parsed.pathname.endsWith("/me/accounts")) {
        assert.equal(options.headers.authorization, "Bearer EAA-long-user-token-that-is-long-enough");
        return response({
          data: [
            {
              id: "999999999999999",
              name: "Other Page",
              access_token: "EAA-other-page-token-that-is-long-enough",
              tasks: ["ANALYZE"]
            },
            {
              id: baseEnv.META_PAGE_ID,
              name: "Streetwise Connection",
              access_token: "EAA-streetwise-page-token-that-is-long-enough",
              tasks: ["CREATE_CONTENT", "ADVERTISE", "MODERATE"]
            }
          ]
        });
      }
      throw new Error(`unexpected_url:${parsed.pathname}`);
    }
  });

  const authorization = new URL(service.authorizationUrl());
  const result = await service.complete({
    code: "authorization-code",
    state: authorization.searchParams.get("state")
  });

  assert.equal(result.connected, true);
  assert.equal(result.pageId, baseEnv.META_PAGE_ID);
  assert.equal(result.pageName, "Streetwise Connection");
  assert.equal(saved.length, 1);
  assert.equal(saved[0].pageToken, "EAA-streetwise-page-token-that-is-long-enough");
  assert.equal(saved[0].pageToken.includes("user-token"), false);
  assert.equal(seen.length, 3);
});

test("OAuth callback rejects invalid state before exchanging credentials", async () => {
  let called = false;
  const service = createFacebookOAuthService({
    env: baseEnv,
    fetchImpl: async () => {
      called = true;
      return response({});
    }
  });

  await assert.rejects(
    () => service.complete({ code: "authorization-code", state: "invalid.state" }),
    /meta_oauth_state_invalid/
  );
  assert.equal(called, false);
});

test("OAuth callback refuses to connect an account that cannot manage the configured Streetwise Page", async () => {
  const service = createFacebookOAuthService({
    env: baseEnv,
    now: () => 1_790_000_000_000,
    saveConnection: async () => {
      throw new Error("save_should_not_run");
    },
    fetchImpl: async url => {
      const parsed = new URL(String(url));
      if (parsed.pathname.endsWith("/oauth/access_token") && !parsed.searchParams.has("grant_type")) {
        return response({ access_token: "EAA-short-user-token-that-is-long-enough" });
      }
      if (parsed.pathname.endsWith("/oauth/access_token")) {
        return response({ access_token: "EAA-long-user-token-that-is-long-enough" });
      }
      return response({
        data: [{
          id: "999999999999999",
          name: "Other Page",
          access_token: "EAA-other-page-token-that-is-long-enough",
          tasks: ["CREATE_CONTENT"]
        }]
      });
    }
  });

  const authorization = new URL(service.authorizationUrl());
  await assert.rejects(
    () => service.complete({
      code: "authorization-code",
      state: authorization.searchParams.get("state")
    }),
    /streetwise_page_not_authorized/
  );
});
