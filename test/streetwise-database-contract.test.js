import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import test from 'node:test';

const schema = readFileSync(new URL('../database/streetwise_core_foundation.sql', import.meta.url), 'utf8');
const tables = ['customers', 'service_plans', 'subscriptions', 'devices', 'esim_orders', 'call_sessions', 'operational_events'];

test('all core operational tables are defined in the private schema', () => {
  assert.match(schema, /create schema if not exists streetwise_core;/i);
  for (const table of tables) {
    assert.match(schema, new RegExp('create table if not exists streetwise_core\\.' + table + '\\s*\\(', 'i'));
  }
});

test('every operational table enables row level security', () => {
  for (const table of tables) {
    assert.match(schema, new RegExp('alter table streetwise_core\\.' + table + ' enable row level security;', 'i'));
  }
});

test('anonymous and authenticated roles receive no direct access', () => {
  assert.match(schema, /revoke all on schema streetwise_core from public, anon, authenticated;/i);
  assert.match(schema, /revoke all on all tables in schema streetwise_core from anon, authenticated;/i);
  assert.match(schema, /revoke all on all sequences in schema streetwise_core from anon, authenticated;/i);
  assert.doesNotMatch(schema, /create policy|grant\s+.*\s+to\s+(?:anon|authenticated)/i);
});

test('schema does not create billable, provisioning or call activation side effects', () => {
  assert.doesNotMatch(schema, /create trigger|create function|http_post|net\.http|insert into|update\s+streetwise_core/i);
});
