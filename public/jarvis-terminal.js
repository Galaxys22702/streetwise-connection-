// Terminal-style shortcuts only prepare existing authenticated workflows.
const shortcuts = Object.freeze({
  help: Object.freeze({ kind: "help" }),
  status: Object.freeze({ kind: "chat", value: "/status" }),
  git: Object.freeze({ kind: "command", value: "git status --short" }),
  changes: Object.freeze({ kind: "command", value: "git diff --stat" }),
  prs: Object.freeze({ kind: "command", value: "gh pr list --state open --limit 10" }),
  node: Object.freeze({ kind: "command", value: "node --version" }),
  npm: Object.freeze({ kind: "command", value: "npm --version" })
});
export const terminalNames = Object.freeze(Object.keys(shortcuts));
export function resolveTerminalShortcut(input) {
  const name = typeof input === "string" ? input.trim().toLowerCase() : "";
  return Object.hasOwn(shortcuts, name) ? shortcuts[name] : null;
}
export function completeTerminalShortcut(input) {
  if (typeof input !== "string") return [];
  const prefix = input.trim().toLowerCase();
  return terminalNames.filter(name => name.startsWith(prefix));
}

export function mountTerminal({ byId, isBusy }) {
  const section = document.createElement("section");
  section.setAttribute("aria-label", "Devil mode terminal shortcuts");
  section.className = "devil-terminal";
  const heading = document.createElement("h2");
  heading.textContent = "JARVIS // DEVIL MODE 100×";
  const banner = document.createElement("p");
  banner.className = "devil-banner";
  banner.textContent = "INFERNO PROTOCOL · OWNER AUTHORIZATION REQUIRED";
  const form = document.createElement("form");
  const label = document.createElement("label");
  label.htmlFor = "terminal-shortcut";
  label.textContent = "Shortcut (type help, use Tab to complete, arrows for history)";
  const input = document.createElement("input");
  input.id = label.htmlFor;
  input.maxLength = 40;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = "devil@jarvis > help";
  const button = document.createElement("button");
  button.textContent = "Prepare shortcut";
  const output = document.createElement("p");
  output.setAttribute("role", "status");
  output.textContent = "Shortcuts prepare drafts only. No shell command runs automatically.";
  const row = document.createElement("div");
  row.className = "row";
  row.append(input, button);
  form.append(label, row);
  section.append(heading, banner, form, output);
  byId("command-workspace").before(section);
  let history = [];
  let cursor = 0;
  const reset = () => {
    history = []; cursor = 0; input.value = "";
    output.textContent = "Shortcuts prepare drafts only. No shell command runs automatically.";
  };
  byId("disconnect").addEventListener("click", () => {
    if (!isBusy()) reset();
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Tab" && !event.shiftKey && input.value.trim()) {
      const matches = completeTerminalShortcut(input.value);
      if (matches.length === 1 && matches[0] !== input.value) {
        event.preventDefault(); input.value = matches[0];
      }
    } else if (event.key === "ArrowUp" && cursor > 0) {
      event.preventDefault(); input.value = history[--cursor];
    } else if (event.key === "ArrowDown" && cursor < history.length) {
      event.preventDefault(); cursor++; input.value = history[cursor] || "";
    }
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (byId("workspace").hidden || isBusy()) return;
    const name = input.value.trim().toLowerCase();
    const action = resolveTerminalShortcut(name);
    input.value = "";
    if (!action) {
      output.textContent = "Unknown shortcut. Type help. Arbitrary shell text is not accepted here.";
      return;
    }
    history = [...history, name].slice(-30); cursor = history.length;
    if (action.kind === "help") {
      output.textContent = terminalNames.join(" · ");
      return;
    }
    if (action.kind === "chat") {
      if (byId("message").value.trim() && byId("message").value !== action.value) {
        output.textContent = "Finish or clear your existing chat draft first.";
        return;
      }
      byId("message").value = action.value;
      byId("message").focus();
      output.textContent = "Status drafted. Select Send message to request it.";
      return;
    }
    if (byId("command-tools").hidden) {
      output.textContent = "Requires an enabled private development runner. Nothing ran.";
      return;
    }
    const draft = byId("command");
    if (draft.value.trim() && draft.value !== action.value) {
      output.textContent = "Finish or clear your existing command draft first.";
      return;
    }
    draft.value = action.value;
    // Invalidate any previously prepared single-use approval.
    draft.dispatchEvent(new Event("input", { bubbles: true }));
    draft.focus();
    output.textContent = "Command drafted. Select Review command, then explicitly approve it to run.";
  });
}
