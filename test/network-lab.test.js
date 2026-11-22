import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
test('homepage links to the network lab', () => {
  assert.match(read('../public/index.html'), /href="\/network-lab\.html"/);
});
test('network lab does not claim live calling or emergency support', () => {
  const page = read('../public/network-lab.html');
  assert.match(page, /Development only/);
  assert.match(page, /not a working phone service/i);
  assert.match(page, /911/);
  assert.match(page, /aria-live="polite"/);
});
test('network lab microphone stream is always stopped', () => {
  const script = read('../public/network-lab.js');
  assert.match(script, /getUserMedia\(\{ audio: true, video: false \}\)/);
  assert.match(script, /finally\s*\{/);
  assert.match(script, /getTracks\(\)\.forEach\(track => track\.stop\(\)\)/);
  assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|sendBeacon/);
});
