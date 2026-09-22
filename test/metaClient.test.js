import test from "node:test";
import assert from "node:assert/strict";
import { createMetaClient } from "../src/integrations/metaClient.js";

const env = {
  META_INTEGRATION_ENABLED: "true",
  META_WRITES_ENABLED: "false",
  META_METADATA_WRITES_ENABLED: "false",
  META_GRAPH_VERSION: "v26.0",
  META_PAGE_ID: "108798728689570",
  META_PAGE_ACCESS_TOKEN: "test-token-that-is-long-enough"
};

test("Meta network failures are classified without provider details", async () => {
  const client = createMetaClient({
    env,
    fetchImpl: async () => {
      throw new TypeError("socket detail");
    }
  });

  await assert.rejects(
    () => client.request(client.pageId),
    error => {
      assert.equal(error.message, "meta_graph_unavailable");
      assert.equal(error.statusCode, 502);
      assert.equal(error.metaPublicCode, "meta_unavailable");
      return true;
    }
  );
});

test("Meta request timeouts are classified separately", async () => {
  const timeout = new Error("timed out");
  timeout.name = "TimeoutError";

  const client = createMetaClient({
    env,
    fetchImpl: async () => {
      throw timeout;
    }
  });

  await assert.rejects(
    () => client.request(client.pageId),
    error => {
      assert.equal(error.message, "meta_graph_timeout");
      assert.equal(error.statusCode, 504);
      assert.equal(error.metaPublicCode, "meta_timeout");
      return true;
    }
  );
});

test("invalid Meta JSON responses are classified as upstream failures", async () => {
  const client = createMetaClient({
    env,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async text() {
        return "not-json";
      }
    })
  });

  await assert.rejects(
    () => client.request(client.pageId),
    error => {
      assert.equal(error.message, "meta_graph_invalid_response");
      assert.equal(error.statusCode, 502);
      assert.equal(error.metaPublicCode, "meta_invalid_response");
      return true;
    }
  );
});
