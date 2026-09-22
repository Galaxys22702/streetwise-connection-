import test from "node:test";
import assert from "node:assert/strict";
import {
  loadMetaPageConnection,
  saveMetaPageConnection
} from "../src/services/facebookTokenStore.js";

const env = {
  META_TOKEN_ENCRYPTION_KEY: "11".repeat(32)
};

function memoryQuery() {
  let row = null;

  return {
    async query(sql, params) {
      if (sql.includes("INSERT INTO meta_page_connections")) {
        row = {
          page_id: params[0],
          page_name: params[1],
          token_ciphertext: params[2],
          token_iv: params[3],
          token_tag: params[4],
          tasks: JSON.parse(params[5]),
          connected_at: new Date("2026-09-22T00:00:00Z"),
          updated_at: new Date("2026-09-22T00:00:00Z")
        };
        return { rowCount: 1, rows: [] };
      }

      if (sql.includes("FROM meta_page_connections")) {
        if (!row || row.page_id !== params[0]) return { rowCount: 0, rows: [] };
        return { rowCount: 1, rows: [row] };
      }

      throw new Error("unexpected_query");
    },
    get row() {
      return row;
    }
  };
}

test("Meta Page tokens are encrypted before database storage and decrypt on read", async () => {
  const memory = memoryQuery();
  const pageToken = "EAA-page-token-that-must-never-be-stored-in-plaintext";

  await saveMetaPageConnection({
    pageId: "108798728689570",
    pageName: "Streetwise Connection",
    pageToken,
    tasks: ["CREATE_CONTENT", "ADVERTISE", "CREATE_CONTENT"]
  }, { env, queryImpl: memory.query.bind(memory) });

  assert.equal(memory.row.token_ciphertext.includes(pageToken), false);
  assert.notEqual(memory.row.token_ciphertext, pageToken);
  assert.equal(Buffer.from(memory.row.token_iv, "base64url").length, 12);
  assert.equal(Buffer.from(memory.row.token_tag, "base64url").length, 16);
  assert.equal(memory.row.tasks.length, 2);

  const loaded = await loadMetaPageConnection("108798728689570", {
    env,
    queryImpl: memory.query.bind(memory)
  });

  assert.equal(loaded.pageToken, pageToken);
  assert.equal(loaded.pageName, "Streetwise Connection");
  assert.deepEqual(loaded.tasks.sort(), ["ADVERTISE", "CREATE_CONTENT"]);
});

test("Meta token storage fails closed when the encryption key is missing", async () => {
  const memory = memoryQuery();

  await assert.rejects(
    () => saveMetaPageConnection({
      pageId: "108798728689570",
      pageToken: "EAA-page-token-that-is-long-enough"
    }, { env: {}, queryImpl: memory.query.bind(memory) }),
    /meta_token_encryption_key_not_configured/
  );
});

test("tampered encrypted Meta tokens are rejected", async () => {
  const memory = memoryQuery();

  await saveMetaPageConnection({
    pageId: "108798728689570",
    pageToken: "EAA-page-token-that-is-long-enough"
  }, { env, queryImpl: memory.query.bind(memory) });

  memory.row.token_tag = Buffer.from("tampered-tag").toString("base64url");

  await assert.rejects(
    () => loadMetaPageConnection("108798728689570", {
      env,
      queryImpl: memory.query.bind(memory)
    }),
    /meta_page_token_decryption_failed/
  );
});

test("shortened AES-GCM authentication tags are rejected", async () => {
  const memory = memoryQuery();

  await saveMetaPageConnection({
    pageId: "108798728689570",
    pageToken: "EAA-page-token-that-is-long-enough"
  }, { env, queryImpl: memory.query.bind(memory) });

  const fullTag = Buffer.from(memory.row.token_tag, "base64url");
  memory.row.token_tag = fullTag.subarray(0, 12).toString("base64url");

  await assert.rejects(
    () => loadMetaPageConnection("108798728689570", {
      env,
      queryImpl: memory.query.bind(memory)
    }),
    /meta_page_token_decryption_failed/
  );
});

test("encrypted Meta tokens are authenticated against their Page ID", async () => {
  const memory = memoryQuery();

  await saveMetaPageConnection({
    pageId: "108798728689570",
    pageToken: "EAA-page-token-that-is-long-enough"
  }, { env, queryImpl: memory.query.bind(memory) });

  // Simulate a valid ciphertext/IV/tag tuple being moved to a different row.
  memory.row.page_id = "108798728689571";

  await assert.rejects(
    () => loadMetaPageConnection("108798728689571", {
      env,
      queryImpl: memory.query.bind(memory)
    }),
    /meta_page_token_decryption_failed/
  );
});
