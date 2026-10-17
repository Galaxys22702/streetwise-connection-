// Apply narrow, checked patches to the immutable Railway template.
const fs = require("node:fs");
const path = require("node:path");
const modelMethods = require("./setup-models.cjs");
const root = process.argv[2] || "/app";

function replaceOnce(source, before, after, description) {
  if (source.split(before).length !== 2) {
    throw new Error("Expected exactly one " + description + " in the pinned template.");
  }
  return source.replace(before, () => after);
}

const serverFile = path.join(root, "src/server.js");
let server = fs.readFileSync(serverFile, "utf8");
const start = '        log.info("wrapper", "running openclaw doctor --fix...");';
const end = '        if (dr.output) log.info("wrapper", dr.output);';
if (server.split(start).length !== 2 || server.split(end).length !== 2) {
  throw new Error("Pinned template startup repair block was not found exactly once.");
}
const first = server.indexOf(start);
const last = server.indexOf(end, first);
if (first < 0 || last < first) throw new Error("Unexpected template startup structure.");
server = server.slice(0, first)
  + '        log.info("wrapper", "Automatic doctor repair deferred; gateway starts directly.");'
  + server.slice(last + end.length);

// A failed model selection must not continue as a successful setup.
const modelResult = '        stream(`[models set] exit=${modelResult.code}\\n`);';
server = replaceOnce(server, modelResult, modelResult + `
        if (modelResult.code !== 0) {
          stream("\\n[setup] Failed: provider configured, but model selection failed. Choose an available model in OpenClaw settings.\\n");
          return res.end();
        }`, "model selection result");

const setupFile = path.join(root, "src/public/setup.html");
let setup = fs.readFileSync(setupFile, "utf8");
const oldRefresh = `          this.authGroups = j.authGroups || [];
          if (this.authGroups.length > 0) {
            this.selectedGroup = this.authGroups[0].value;
            this.updateAuthChoices();
          }`;
setup = replaceOnce(setup, oldRefresh, "          this.syncAuthGroups(j.authGroups || []);", "provider refresh");
const oldChoices = `      updateAuthChoices() {
        const group = this.currentGroup;
        this.authChoices = (group && group.options) ? group.options : [];
        if (this.authChoices.length > 0) {
          this.selectedAuth = this.authChoices[0].value;
        }
      },`;
const methods = Object.values(modelMethods).map(method => method.toString()).join(",\n\n");
setup = replaceOnce(setup, oldChoices, methods + ",", "authentication choices");
setup = replaceOnce(setup, '@change="updateAuthChoices()"', '@change="changeAuthProvider()"', "provider change handler");
setup = replaceOnce(setup, 'x-model="selectedAuth" class="select"', 'x-model="selectedAuth" @change="changeAuthMethod()" class="select"', "authentication change handler");
setup = replaceOnce(setup, "Format: provider/model-name",
  "Optional: leave blank for the provider default. Otherwise use the full model ID from your provider or gateway.",
  "model guidance");

// Retain the upstream empty model default. Authentication groups and model
// prefixes are not equivalent (e.g. self-hosted/ollama, copilot/github-copilot,
// OpenAI/Codex, and multi-provider gateways). Let OpenClaw resolve its catalog.
// Write only after every expected template anchor has been verified.
fs.writeFileSync(serverFile, server);
fs.writeFileSync(setupFile, setup);
console.log("Preserved provider defaults, model aliases, saved authentication and direct gateway startup.");
