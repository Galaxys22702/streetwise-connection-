import test from "node:test";
import assert from "node:assert/strict";
import { createFacebookPageService } from "../src/services/facebookPageService.js";

const baseEnv = {
  META_INTEGRATION_ENABLED: "true",
  META_WRITES_ENABLED: "false",
  META_METADATA_WRITES_ENABLED: "false",
  META_GRAPH_VERSION: "v26.0",
  META_PAGE_ID: "108798728689570",
  META_PAGE_ACCESS_TOKEN: "EAA-test-token-that-is-long-enough"
};

function fakeResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(body);
    }
  };
}

test("facebook integration is fail-closed by default", () => {
  const service = createFacebookPageService({ env: {} });
  assert.deepEqual(service.status(), {
    enabled: false,
    writesEnabled: false,
    metadataWritesEnabled: false,
    graphVersion: "v26.0",
    pageIdConfigured: false,
    tokenConfigured: false
  });
});

test("Meta token is sent in an Authorization header, never the URL", async () => {
  let seen;
  const service = createFacebookPageService({
    env: { ...baseEnv },
    fetchImpl: async (url, options) => {
      seen = { url: String(url), options };
      return fakeResponse({ id: baseEnv.META_PAGE_ID, name: "Streetwise Connection" });
    }
  });

  const page = await service.getPage();
  assert.equal(page.name, "Streetwise Connection");
  assert.equal(seen.options.headers.authorization, `Bearer ${baseEnv.META_PAGE_ACCESS_TOKEN}`);
  assert.equal(seen.url.includes(baseEnv.META_PAGE_ACCESS_TOKEN), false);
  assert.match(seen.url, /graph\.facebook\.com\/v26\.0\/108798728689570/);
});

test("post writes remain disabled until explicitly enabled", async () => {
  const service = createFacebookPageService({
    env: { ...baseEnv },
    fetchImpl: async () => {
      throw new Error("network should not be reached");
    }
  });

  await assert.rejects(
    () => service.createPost({ message: "test" }),
    /meta_writes_disabled/
  );
});

test("metadata writes require their own second safety switch", async () => {
  const service = createFacebookPageService({
    env: { ...baseEnv, META_WRITES_ENABLED: "true" },
    fetchImpl: async () => {
      throw new Error("network should not be reached");
    }
  });

  await assert.rejects(
    () => service.updatePage({ website: "https://example.com" }),
    /meta_metadata_writes_disabled/
  );
});

test("empty website metadata is rejected before contacting Meta", async () => {
  const service = createFacebookPageService({
    env: {
      ...baseEnv,
      META_WRITES_ENABLED: "true",
      META_METADATA_WRITES_ENABLED: "true"
    },
    fetchImpl: async () => {
      throw new Error("network should not be reached");
    }
  });

  await assert.rejects(
    () => service.updatePage({ website: "" }),
    /website_must_be_a_valid_url/
  );
});

test("enabled post write targets the Page feed", async () => {
  let seen;
  const service = createFacebookPageService({
    env: { ...baseEnv, META_WRITES_ENABLED: "true" },
    fetchImpl: async (url, options) => {
      seen = { url: String(url), options };
      return fakeResponse({ id: "108798728689570_123" });
    }
  });

  const result = await service.createPost({
    message: "Streetwise test",
    link: "https://streetwise-connection.vercel.app/"
  });

  assert.equal(result.id, "108798728689570_123");
  assert.match(seen.url, /\/108798728689570\/feed$/);
  assert.equal(seen.options.method, "POST");
  assert.match(seen.options.body, /message=Streetwise\+test/);
  assert.match(seen.options.body, /streetwise-connection/);
});

test("Graph errors do not leak the configured access token", async () => {
  const service = createFacebookPageService({
    env: { ...baseEnv },
    fetchImpl: async () =>
      fakeResponse({
        error: {
          code: 190,
          type: "OAuthException",
          message: `bad token ${baseEnv.META_PAGE_ACCESS_TOKEN}`
        }
      }, 400)
  });

  await assert.rejects(
    () => service.getPage(),
    error => {
      assert.equal(error.message.includes(baseEnv.META_PAGE_ACCESS_TOKEN), false);
      assert.match(error.message, /\[REDACTED\]/);
      return true;
    }
  );
});
