import test from "node:test";
import assert from "node:assert/strict";
import { requestJarvisReply, resolveJarvisProvider } from "../src/services/jarvisProvider.js";
import { chatWithJarvis, jarvisStatus } from "../src/services/jarvisChat.js";

const env = { OPENROUTER_API_KEY: "test-only-provider-fixture" };
const messages = [{ role: "user", content: "Reply with READY." }];

test("an OpenRouter key alone enables free chat with a zero price ceiling and no client-selected route", async () => {
  assert.equal(jarvisStatus(env).aiConfigured, true);
  let calls = 0;
  const result = await chatWithJarvis({ messages, model: "openrouter/auto", provider: { max_price: {} } }, {
    env, fetchImpl: async (url, options) => {
      calls += 1;
      assert.equal(url.href, "https://openrouter.ai/api/v1/chat/completions");
      assert.equal(options.redirect, "error");
      const body = JSON.parse(options.body);
      assert.equal(body.model, "openrouter/free");
      assert.deepEqual(body.provider.max_price, { prompt: 0, completion: 0 });
      assert.equal(body.max_tokens, 1000);
      assert.deepEqual(body.reasoning, { effort: "minimal" });
      assert.deepEqual(body.messages.at(-1), messages[0]);
      return Response.json({ choices: [{ message: { content: "READY" } }] });
    }
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true, reply: "READY", source: "ai" });
});

test("free API and OpenClaw model IDs normalize while paid Auto and paid models fail before inference", async () => {
  for (const model of ["openrouter/free", "openrouter/openrouter/free", "vendor/model:free", "openrouter/vendor/model:free"]) {
    const resolved = resolveJarvisProvider({ ...env, JARVIS_AI_MODEL: model });
    assert.equal(resolved.model, model.includes("vendor") ? "vendor/model:free" : "openrouter/free");
  }
  for (const model of ["openrouter/auto", "openrouter/openrouter/auto", "openrouter:auto", "vendor/paid", "vendor/free:online"]) {
    await assert.rejects(requestJarvisReply(messages, { env: { ...env, JARVIS_AI_MODEL: model },
      fetchImpl: () => assert.fail("paid routes must never be called") }), { message: "jarvis_free_model_required" });
    assert.equal(jarvisStatus({ ...env, JARVIS_AI_MODEL: model }).aiConfigured, false);
  }
  assert.equal(resolveJarvisProvider({ ...env, JARVIS_AI_URL: "https://openrouter.ai/api/v1/chat/completions/" }).openrouter, true);
});

test("provider-specific keys never leak to a custom host, and explicit custom provider configuration stays supported", async () => {
  assert.equal(resolveJarvisProvider({ ...env, JARVIS_AI_URL: "https://custom.example/v1/chat/completions", JARVIS_AI_MODEL: "custom" }), null);
  for (const url of ["http://openrouter.ai/api/v1/chat/completions", "https://name:pass@openrouter.ai/api/v1/chat/completions", "https://openrouter.ai/other"]) {
    assert.throws(() => resolveJarvisProvider({ ...env, JARVIS_AI_URL: url }), { message: "jarvis_invalid_provider_url" });
  }
  const custom = resolveJarvisProvider({ JARVIS_AI_KEY: "test-only-custom-fixture", JARVIS_AI_MODEL: "custom", JARVIS_AI_URL: "https://custom.example/v1/chat/completions" });
  assert.equal(custom.openrouter, false);
  assert.equal(custom.model, "custom");
});

test("free quota, authentication and billing refusals are specific, redacted, and never retry a paid fallback", async () => {
  for (const [status, code] of [[429, "jarvis_provider_rate_limited"], [401, "jarvis_provider_auth_failed"],
    [403, "jarvis_provider_auth_failed"], [402, "jarvis_provider_billing_required"], [503, "jarvis_provider_unavailable"]]) {
    let calls = 0;
    await assert.rejects(requestJarvisReply(messages, { env, fetchImpl: async () => {
      calls += 1;
      return new Response("private-provider-detail", { status, headers: { "retry-after": "17" } });
    } }), error => {
      assert.equal(error.message, code);
      assert.equal(error.statusCode, status === 429 ? 429 : 502);
      assert.equal(error.retryAfterSeconds, status === 429 ? 17 : undefined);
      assert.doesNotMatch(JSON.stringify(error), /private-provider-detail|test-only-provider-fixture/);
      return true;
    });
    assert.equal(calls, 1);
  }
});

test("empty, partial and oversized provider replies never count as a completed answer", async () => {
  for (const content of [undefined, "", " ", [], "x".repeat(16001)]) {
    await assert.rejects(requestJarvisReply(messages, { env,
      fetchImpl: async () => Response.json({ choices: [{ message: { content } }] }) }), { message: "jarvis_provider_unavailable" });
  }
});
