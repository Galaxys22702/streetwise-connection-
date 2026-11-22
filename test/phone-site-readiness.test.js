import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("website favicon fallback points to the existing brand image", () => {
  const config = JSON.parse(read("vercel.json"));
  const icon = config.rewrites.find((rule) => rule.source === "/favicon.ico");
  assert.deepEqual(icon, { source: "/favicon.ico", destination: "/streetwise-mark.png" });
  assert.equal(existsSync(new URL("public/streetwise-mark.png", root)), true);
  assert.ok(read("public/index.html").includes('<link rel="icon" type="image/png" href="/streetwise-mark.png" />'));
});

test("Jarvis connection UI distinguishes configuration from live reply readiness", () => {
  const ui = read("public/jarvis.js");
  assert.ok(ui.includes("AI configured (test a reply)"));
  assert.ok(ui.includes("successful live reply has not been confirmed"));
  assert.ok(!ui.includes("Jarvis connected · Chat ready"));
  assert.ok(!ui.includes("Command workspace ready"));
});


test("account controls remain unavailable until internal access is confirmed", () => {
  const html = read("public/account.html");
  const script = read("public/account.js");
  assert.ok(html.includes('id="account-submit" class="button" type="button" hidden'));
  assert.ok(html.includes('id="account-email" type="email" autocomplete="email" maxlength="254" required disabled'));
  assert.ok(html.includes('href="/#waitlist"'));
  assert.ok(script.includes('fetch("/api/public-status"'));
  assert.ok(script.includes('status?.publicLaunchMode !== "internal"'));
  assert.ok(script.includes('submitEl.hidden = true'));
  assert.ok(script.includes('Accounts are not open'));
});


test("Jarvis owner page opts out of indexing without disabling its controls", () => {
  const html = read("public/jarvis.html");
  const config = JSON.parse(read("vercel.json"));
  assert.ok(html.includes('<meta name="robots" content="noindex, nofollow, noarchive">'));
  const policy = config.headers.find((item) => item.source === "/jarvis.html");
  assert.ok(policy.headers.some((header) =>
    header.key === "X-Robots-Tag" && header.value === "noindex, nofollow, noarchive"));
  assert.ok(html.includes('id="connect-form"'));
});
