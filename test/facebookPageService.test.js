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

test("facebook integration is fail-closed by default", async () => {
  const service = createFacebookPageService({ env: {} });
  assert.deepEqual(await service.status(), {
    enabled: false,
    writesEnabled: false,
    metadataWritesEnabled: false,
    graphVersion: "v26.0",
    pageIdConfigured: false,
    tokenConfigured: false,
    credentialSource: "none"
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

test("encrypted OAuth Page credentials are used when no static token is configured", async () => {
  let seenAuthorization;
  const storedToken = "EAA-encrypted-store-token-that-is-long-enough";
  const service = createFacebookPageService({
    env: { ...baseEnv, META_PAGE_ACCESS_TOKEN: "" },
    loadConnection: async pageId => ({
      pageId,
      pageName: "Streetwise Connection",
      pageToken: storedToken,
      tasks: ["CREATE_CONTENT"]
    }),
    fetchImpl: async (_url, options) => {
      seenAuthorization = options.headers.authorization;
      return fakeResponse({ id: baseEnv.META_PAGE_ID, name: "Streetwise Connection" });
    }
  });

  assert.deepEqual(await service.status(), {
    enabled: true,
    writesEnabled: false,
    metadataWritesEnabled: false,
    graphVersion: "v26.0",
    pageIdConfigured: true,
    tokenConfigured: true,
    credentialSource: "encrypted_store"
  });

  await service.getPage();
  assert.equal(seenAuthorization, `Bearer ${storedToken}`);
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

test("non-object post payloads are rejected before contacting Meta", async () => {
  const service = createFacebookPageService({
    env: { ...baseEnv, META_WRITES_ENABLED: "true" },
    fetchImpl: async () => {
      throw new Error("network should not be reached");
    }
  });

  await assert.rejects(
    () => service.createPost(null),
    /request_body_must_be_an_object/
  );
  await assert.rejects(
    () => service.createPost([]),
    /request_body_must_be_an_object/
  );
});

test("non-object metadata payloads are rejected before contacting Meta", async () => {
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
    () => service.updatePage(null),
    /request_body_must_be_an_object/
  );
  await assert.rejects(
    () => service.updatePage("not-an-object"),
    /request_body_must_be_an_object/
  );
});

test("post fields must be strings", async () => {
  const service = createFacebookPageService({
    env: { ...baseEnv, META_WRITES_ENABLED: "true" },
    fetchImpl: async () => {
      throw new Error("network should not be reached");
    }
  });

  await assert.rejects(
    () => service.createPost({ message: { text: "bad" } }),
    /message_must_be_a_string/
  );
  await assert.rejects(
    () => service.createPost({ link: 123 }),
    /link_must_be_a_string/
  );
});

test("metadata fields must be strings and URLs cannot contain credentials", async () => {
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
    () => service.updatePage({ about: { text: "bad" } }),
    /about_must_be_a_string/
  );
  await assert.rejects(
    () => service.updatePage({ description: 123 }),
    /description_must_be_a_string/
  );
  await assert.rejects(
    () => service.updatePage({ website: "https://user:pass@example.com" }),
    /website_must_not_contain_credentials/
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

test("invalid Meta access tokens are classified for reauthorization without leaking the token", async () => {
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
      assert.equal(error.statusCode, 503);
      assert.equal(error.metaPublicCode, "meta_reauthorization_required");
      assert.equal(error.metaCode, 190);
      return true;
    }
  );
});

test("Meta permission and rate-limit failures receive safe recovery classifications", async () => {
  for (const scenario of [
    { code: 200, status: 400, localStatus: 503, publicCode: "meta_permission_required" },
    { code: 283, status: 400, localStatus: 503, publicCode: "meta_permission_required" },
    { code: 80001, status: 400, localStatus: 429, publicCode: "meta_rate_limited" }
  ]) {
    const service = createFacebookPageService({
      env: { ...baseEnv },
      fetchImpl: async () =>
        fakeResponse({
          error: {
            code: scenario.code,
            type: "OAuthException",
            message: "provider detail that should stay internal"
          }
        }, scenario.status)
    });

    await assert.rejects(
      () => service.getPage(),
      error => {
        assert.equal(error.statusCode, scenario.localStatus);
        assert.equal(error.metaPublicCode, scenario.publicCode);
        assert.equal(error.metaCode, scenario.code);
        return true;
      }
    );
  }
});
