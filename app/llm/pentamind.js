import { performance } from 'node:perf_hooks';
import { validateModel } from './free-model-guard.js';

// Candidate IDs are selected dynamically from the currently verified catalog.
// The five roles are independent calls; no paid fallback is permitted.
export const ROLES = Object.freeze([
  { id: 'speed', temperature: 0.2 },
  { id: 'reason', temperature: 0.3 },
  { id: 'code', temperature: 0.1 },
  { id: 'facts', temperature: 0 },
  { id: 'creative', temperature: 0.7 },
]);

const DEFAULT_TIMEOUT_MS = 12000;
const safeError = error => error?.name === 'AbortError' ? 'timeout' : 'request_failed';

export async function pentamind(prompt, {
  models,
  fetchImpl = fetch,
  validate = validateModel,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now = () => performance.now(),
  apiKey = process.env.OPENROUTER_API_KEY,
} = {}) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 4000) {
    throw new Error('PENTAMIND_INVALID_PROMPT');
  }
  if (!apiKey) throw new Error('PENTAMIND_MISSING_API_KEY');
  if (!Array.isArray(models) || models.length !== 5 || new Set(models).size !== 5) {
    throw new Error('PENTAMIND_REQUIRES_FIVE_DISTINCT_MODELS');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60000) {
    throw new Error('PENTAMIND_INVALID_TIMEOUT');
  }

  // Verify all five before making any completion request.
  await Promise.all(models.map(model => validate(model)));
  const started = now();
  const settled = await Promise.allSettled(ROLES.map(async (role, index) => {
    const model = models[index];
    const began = now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: role.temperature,
          max_tokens: 300,
          stream: false,
        }),
      });
      if (!response.ok) throw new Error('provider_error');
      const payload = await response.json();
      const answer = payload?.choices?.[0]?.message?.content;
      if (typeof answer !== 'string' || !answer.trim()) throw new Error('empty_answer');
      // Provider may return an unexpected model. Reject a paid or unknown substitution.
      if (payload.model && payload.model !== model) {
        await validate(payload.model);
        throw new Error('model_substitution');
      }
      return { id: role.id, model, answer, latencyMs: Math.round(now() - began) };
    } finally {
      clearTimeout(timer);
    }
  }));
  const results = settled.map((entry, index) => entry.status === 'fulfilled'
    ? { ...entry.value, status: 'ok' }
    : { id: ROLES[index].id, model: models[index], status: 'failed', reason: safeError(entry.reason) });

  const successful = results.filter(result => result.status === 'ok');
  if (!successful.length) {
    const error = new Error('PENTAMIND_ALL_MODELS_FAILED');
    error.results = results;
    throw error;
  }

  // No unverified majority or synthesized factual claims. Return labeled
  // independent answers for a downstream evidence-aware merger.
  return {
    status: successful.length === 5 ? 'complete' : 'partial',
    totalLatencyMs: Math.round(now() - started),
    target900msMet: now() - started < 900,
    answers: successful,
    results,
    mergeStatus: 'pending_evidence_aware_merger',
  };
}
