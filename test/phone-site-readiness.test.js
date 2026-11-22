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
  assert.match(read("public/index.html"), /<link rel="icon" type="image\\/png" href="\\/streetwise-mark\\.png"/);
});

test("Jarvis connection UI distinguishes configuration from live reply readiness", () => {
  const ui = read("public/jarvis.js");
  assert.match(ui, /AI configured \\(test a reply\\)/);
  assert.match(ui, /successful live reply has not been confirmed/);
  assert.doesNotMatch(ui, /Jarvis connected · Chat ready/);
  assert.doesNotMatch(ui, /Command workspace ready/);
});
