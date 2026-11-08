import fs from 'node:fs/promises';
import path from 'node:path';

const API_URL = 'https://openrouter.ai/api/v1/models';
const TTL_MS = 60 * 60 * 1000;
let cache = { models: null, expiresAt: 0 };
const isZero = value => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) === 0;
const safeModel = value => String(value).replace(/[^a-zA-Z0-9:._/-]/g, '_').slice(0, 160);

export async function getVerifiedFreeModels({ fetchImpl = fetch, now = Date.now() } = {}) {
  if (cache.models && now < cache.expiresAt) return [...cache.models];
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('FREE_MODEL_CATALOG_UNAVAILABLE: API key missing');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchImpl(API_URL, {
      headers: { Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`catalog HTTP ${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body?.data)) throw new Error('invalid catalog response');
    const models = body.data.filter(model => {
      if (typeof model?.id !== 'string' || !model.id.endsWith(':free')) return false;
      const pricing = model.pricing;
      if (!pricing || !isZero(pricing.prompt) || !isZero(pricing.completion)) return false;
      // Reject any explicitly priced ancillary operations.
      for (const [name, value] of Object.entries(pricing)) {
        if (name !== 'prompt' && name !== 'completion' && !isZero(value)) return false;
      }
      return true;
    }).map(model => model.id);
    if (!models.length) throw new Error('no verified free models');
    cache = { models: new Set(models), expiresAt: now + TTL_MS };
    return [...cache.models];
  } catch {
    // Never reuse an expired catalog after an error.
    cache = { models: null, expiresAt: 0 };
    throw new Error('FREE_MODEL_CATALOG_UNAVAILABLE');
  } finally {
    clearTimeout(timeout);
  }
}

export async function validateModel(model, options = {}) {
  try {
    const allowed = await getVerifiedFreeModels(options);
    if (typeof model === 'string' && allowed.includes(model)) return model;
  } catch {
    // A catalog failure is also a block.
  }
  const dataDir = process.env.JARVIS_DATA_DIR || '/data';
  const sha = safeModel(process.env.RAILWAY_GIT_COMMIT_SHA || 'local');
  const entry = `${new Date().toISOString()} sha=${sha} model=${safeModel(model)} blocked\n`;
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.appendFile(path.join(dataDir, 'BLOCKED_MODEL'), entry, { mode: 0o600 });
  } catch {
    // Logging failure must not permit a request.
  }
  throw new Error('BILLING_FAIL_CLOSED: model not verified free');
}
