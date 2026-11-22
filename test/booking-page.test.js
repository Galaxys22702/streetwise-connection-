import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('phone support has an accessible booking route with real contact and prices', () => {
  const booking = readFileSync(new URL('../public/book.html', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(home, /href="\/book\.html"/);
  for (const price of ['$29', '$49', '$69', '$25']) assert.ok(booking.includes(price));
  assert.match(booking, /instagram\.com\/streetwiseconnection/);
  assert.match(booking, /No online payment or cellular service activation/);
  assert.match(booking, /Never send passwords/);
});
