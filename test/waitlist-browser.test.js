import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
function page(fetch) {
  const controls = [{ disabled: true }, { disabled: true }, { disabled: true }];
  let submit;
  const nodes = {
    '#waitlist-form': { querySelectorAll: () => controls, addEventListener: (_, fn) => { submit = fn; }, reset() {} },
    '#waitlist-submit': controls[2], '#waitlist-result': {}, '#waitlist-contact': {}, '#waitlist-status': {}
  };
  vm.runInNewContext(source, { document: { querySelector: id => nodes[id] }, fetch, AbortSignal,
    FormData: class { get() { return 'fixture@example.com'; } } });
  return { nodes, controls, submit: () => submit({ preventDefault() {} }) };
}
const open = { ok: true, json: async () => ({ waitlist: { open: true, consentVersion: '1' } }) };
test('waitlist starts disabled in HTML before JavaScript or status can load', () => {
  assert.match(html, /id="waitlist-email"[^>]*disabled/);
  assert.match(html, /name="consent"[^>]*disabled/);
  assert.match(html, /id="waitlist-submit"[^>]*disabled/);
});
test('status failure leaves every waitlist control disabled', async () => {
  const p = page(async () => { throw new Error('offline'); });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(p.controls.every(c => c.disabled));
  assert.equal(p.nodes['#waitlist-status'].textContent, 'Unavailable');
});
test('signup timeout is bounded and status failure disables the whole form', async () => {
  let count = 0;
  const p = page(async (_, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    count++;
    if (count === 1) return open;
    if (count === 2) throw Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    throw new Error('offline');
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(p.controls.every(c => !c.disabled));
  await p.submit();
  assert.ok(p.controls.every(c => c.disabled));
  assert.match(p.nodes['#waitlist-result'].textContent, /may have been received/);
});
