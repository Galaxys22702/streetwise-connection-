import test from "node:test";
import assert from "node:assert/strict";
import { resolveTerminalShortcut, completeTerminalShortcut, terminalNames } from "../public/jarvis-terminal.js";
test("terminal only resolves explicit shortcuts", () => {
  assert.deepEqual(resolveTerminalShortcut(" STATUS "), {kind:"chat",value:"/status"});
  assert.deepEqual(resolveTerminalShortcut("git"), {kind:"command",value:"git status --short"});
  assert.deepEqual(resolveTerminalShortcut("prs"), {kind:"command",value:"gh pr list --state open --limit 10"});
  for (const input of ["git push","git; whoami","constructor","__proto__","toString","",null]) assert.equal(resolveTerminalShortcut(input),null);
  assert.ok(Object.isFrozen(resolveTerminalShortcut("git")));
});
test("autocomplete is bounded to known shortcut names", () => {
  assert.deepEqual(completeTerminalShortcut(" PR "),["prs"]);
  assert.deepEqual(completeTerminalShortcut("n"),["node","npm"]);
  assert.deepEqual(completeTerminalShortcut("unknown"),[]);
  assert.equal(terminalNames.length,7);
});

test("autocomplete rejects non-string input", () => {
  for (const input of [null, undefined, 42, {}, []]) assert.deepEqual(completeTerminalShortcut(input), []);
});
