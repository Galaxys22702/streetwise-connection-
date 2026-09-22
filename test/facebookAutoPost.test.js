import test from "node:test";
import assert from "node:assert/strict";
import {
  runFacebookAutoPost,
  STREETWISE_AUTO_POST_MESSAGES
} from "../src/services/facebookAutoPost.js";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    }
  };
}

const adminKey = "a".repeat(32);

test("auto-post content covers a full day without duplicate half-hour captions", () => {
  assert.equal(STREETWISE_AUTO_POST_MESSAGES.length, 48);
  assert.equal(new Set(STREETWISE_AUTO_POST_MESSAGES).size, 48);

  for (const message of STREETWISE_AUTO_POST_MESSAGES) {
    assert.match(message, /Streetwise Connection/i);
    assert.match(message, /https:\/\/streetwise-connection\.vercel\.app\//);
    assert.doesNotMatch(message, /\b(?:live now|available now|unlimited|guaranteed)\b/i);
  }
});

test("auto-post can be disabled without making network calls", async () => {
  const result = await runFacebookAutoPost({
    enabled: false,
    fetchImpl: async () => {
      throw new Error("network should not be reached");
    }
  });

  assert.deepEqual(result, { state: "disabled" });
});

test("auto-post waits until Meta Page writes are fully authorised", async () => {
  const result = await runFacebookAutoPost({
    adminKey,
    fetchImpl: async url => {
      assert.match(String(url), /\/api\/admin\/facebook\/status$/);
      return jsonResponse({
        enabled: true,
        writesEnabled: false,
        pageIdConfigured: true,
        tokenConfigured: true
      });
    }
  });

  assert.equal(result.state, "awaiting_meta_write_authorization");
});

test("auto-post skips when the Page already has a recent post", async () => {
  const nowMs = Date.parse("2026-09-22T07:00:00Z");
  let calls = 0;
  const result = await runFacebookAutoPost({
    adminKey,
    now: () => nowMs,
    fetchImpl: async url => {
      calls += 1;
      if (String(url).includes("/status")) {
        return jsonResponse({
          enabled: true,
          writesEnabled: true,
          pageIdConfigured: true,
          tokenConfigured: true
        });
      }
      return jsonResponse({
        posts: {
          data: [{
            id: "page_recent",
            created_time: "2026-09-22T06:50:00Z"
          }]
        }
      });
    }
  });

  assert.equal(result.state, "skipped_recent_post");
  assert.equal(result.latestPostId, "page_recent");
  assert.equal(calls, 2);
});

test("auto-post publishes a branded image with a rotating message", async () => {
  const nowMs = Date.parse("2026-09-22T07:00:00Z");
  const seen = [];

  const result = await runFacebookAutoPost({
    adminKey,
    now: () => nowMs,
    fetchImpl: async (url, options) => {
      seen.push({ url: String(url), options });
      if (String(url).includes("/status")) {
        return jsonResponse({
          enabled: true,
          writesEnabled: true,
          pageIdConfigured: true,
          tokenConfigured: true
        });
      }
      if (String(url).includes("?limit=1")) {
        return jsonResponse({ posts: { data: [] } });
      }
      return jsonResponse({ post: { id: "photo_post_123" } }, 201);
    }
  });

  assert.equal(result.state, "posted");
  assert.equal(result.postId, "photo_post_123");
  assert.match(result.imageUrl, /streetwise-mark\.png$/);
  assert.equal(seen.length, 3);

  const publish = seen[2];
  assert.equal(publish.options.method, "POST");
  const body = JSON.parse(publish.options.body);
  assert.equal(body.imageUrl, "https://streetwise-connection.vercel.app/streetwise-mark.png");
  assert.equal(body.message, STREETWISE_AUTO_POST_MESSAGES[result.messageIndex]);
});

test("auto-post refuses credential-bearing image URLs", async () => {
  await assert.rejects(
    () => runFacebookAutoPost({
      adminKey,
      imageUrl: "https://user:pass@example.com/image.png",
      fetchImpl: async url => {
        if (String(url).includes("/status")) {
          return jsonResponse({
            enabled: true,
            writesEnabled: true,
            pageIdConfigured: true,
            tokenConfigured: true
          });
        }
        return jsonResponse({ posts: { data: [] } });
      }
    }),
    /must_not_contain_credentials/
  );
});
