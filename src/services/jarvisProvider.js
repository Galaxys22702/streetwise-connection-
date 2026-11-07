const FREE_MODEL = "openrouter/free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const problem = (message, statusCode = 503) => Object.assign(new Error(message), { statusCode });

export function resolveJarvisProvider(env = process.env) {
  if (!String(env.JARVIS_AI_KEY || env.OPENROUTER_API_KEY || "").trim()) return null;
  let endpoint;
  try {
    endpoint = new URL(env.JARVIS_AI_URL || OPENROUTER_URL);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.hash) throw new Error();
  } catch {
    throw problem("jarvis_invalid_provider_url");
  }
  const openrouter = endpoint.hostname === "openrouter.ai";
  if (openrouter && (endpoint.origin !== "https://openrouter.ai" ||
      endpoint.pathname.replace(/\/+$/, "") !== "/api/v1/chat/completions")) {
    throw problem("jarvis_invalid_provider_url");
  }
  // A provider-specific key must never be forwarded to a different custom host.
  const key = String(env.JARVIS_AI_KEY || (openrouter ? env.OPENROUTER_API_KEY : "") || "").trim();
  if (!key) return null;
  let model = String(env.JARVIS_AI_MODEL || env.OPENROUTER_MODEL || (openrouter ? FREE_MODEL : "")).trim();
  if (!model) return null;
  if (openrouter) {
    // Accept OpenClaw's provider-prefixed IDs as well as OpenRouter API IDs.
    if (model.startsWith("openrouter/") && model.split("/").length === 3) model = model.slice(11);
    if (model !== FREE_MODEL && !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:-]+:free$/.test(model)) {
      throw problem("jarvis_free_model_required");
    }
  }
  return { key, endpoint, model, openrouter };
}

export async function requestJarvisReply(messages, { env = process.env, fetchImpl = fetch, instructions = "You are Jarvis, a helpful assistant." } = {}) {
  const provider = resolveJarvisProvider(env);
  if (!provider) throw problem("jarvis_ai_not_configured");
  let response;
  try {
    response = await fetchImpl(provider.endpoint, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
      headers: { "content-type": "application/json", authorization: `Bearer ${provider.key}` },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: "system", content: instructions }, ...messages],
        ...(provider.openrouter ? {
          max_tokens: 1000,
          reasoning: { effort: "minimal" },
          provider: { max_price: { prompt: 0, completion: 0 } }
        } : { max_completion_tokens: 1000 })
      })
    });
  } catch {
    throw problem("jarvis_provider_unavailable", 502);
  }
  // Never expose upstream response bodies: they can contain credentials or chat text.
  if (!response.ok) {
    try { await response.body?.cancel(); } catch { /* Discard private error content. */ }
    if (provider.openrouter && response.status === 429) {
      const retry = Number(response.headers.get("retry-after"));
      const error = problem("jarvis_provider_rate_limited", 429);
      if (Number.isInteger(retry) && retry > 0 && retry <= 3600) error.retryAfterSeconds = retry;
      throw error;
    }
    if (provider.openrouter && [401, 403].includes(response.status)) throw problem("jarvis_provider_auth_failed", 502);
    if (provider.openrouter && response.status === 402) throw problem("jarvis_provider_billing_required", 502);
    throw problem("jarvis_provider_unavailable", 502);
  }
  try {
    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim() || reply.length > 16000) throw new Error();
    return reply.trim();
  } catch {
    throw problem("jarvis_provider_unavailable", 502);
  }
}
