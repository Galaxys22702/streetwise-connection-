import test from 'node:test';
import assert from 'node:assert/strict';
import { pentamind } from '../app/llm/pentamind.js';

const models = Array.from({ length: 5 }, (_, i) => `test/model-${i}:free`);
const response = model => ({ ok: true, json: async () => ({
  model, choices: [{ message: { content: `reply from ${model}` } }],
}) });
const fakeFetch = async (_url, options) => response(JSON.parse(options.body).model);

test('five distinct verified models run and return labeled answers', async () => {
  const validated = [];
  let calls = 0;
  const result = await pentamind('hello', {
    models, apiKey: 'dummy', validate: async model => { validated.push(model); },
    fetchImpl: async (...args) => { calls++; assert.equal(validated.length, 5); return fakeFetch(...args); },
  });
  assert.equal(calls, 5);
  assert.equal(result.status, 'complete');
  assert.equal(result.answers.length, 5);
  assert.equal(result.mergeStatus, 'pending_evidence_aware_merger');
});

test('rejects a paid model before sending completion requests', async () => {
  let calls = 0;
  await assert.rejects(pentamind('hello', {
    models: [...models.slice(0, 4), 'test/paid'],
    apiKey: 'dummy',
    validate: async model => { if (!model.endsWith(':free')) throw Error('blocked'); },
    fetchImpl: async () => { calls++; throw Error('should not run'); },
  }));
  assert.equal(calls, 0);
});

test('partial failure does not invent a fifth response', async () => {
  const result = await pentamind('hello', {
    models, apiKey: 'dummy', validate: async () => {},
    fetchImpl: async (_url, options) => {
      const model = JSON.parse(options.body).model;
      return model === models[2] ? { ok: false, status: 429 } : response(model);
    },
  });
  assert.equal(result.status, 'partial');
  assert.equal(result.answers.length, 4);
  assert.equal(result.results[2].status, 'failed');
});

test('blocks unrequested model substitution', async () => {
  const result = await pentamind('hello', {
    models, apiKey: 'dummy', validate: async model => {
      if (!models.includes(model)) throw Error('blocked');
    },
    fetchImpl: async (_url, options) => {
      const model = JSON.parse(options.body).model;
      return response(model === models[0] ? 'paid/substitute' : model);
    },
  });
  assert.equal(result.status, 'partial');
  assert.equal(result.results[0].status, 'failed');
});
