// Narrow bootstrap patch for the pinned Railway template.
// Keep existing OpenClaw configuration, plugins, and gateway startup untouched.
const fs = require("node:fs");
const file = "/app/src/server.js";
const source = fs.readFileSync(file, "utf8");
const start = '        log.info("wrapper", "running openclaw doctor --fix...");';
const end = '        if (dr.output) log.info("wrapper", dr.output);';
if (source.split(start).length !== 2 || source.split(end).length !== 2) {
  throw new Error("Pinned template startup repair block was not found exactly once.");
}
const first = source.indexOf(start);
const last = source.indexOf(end, first);
if (first < 0 || last < first) throw new Error("Unexpected template startup structure.");
const repaired = source.slice(0, first)
  + '        log.info("wrapper", "Automatic doctor repair deferred; gateway starts directly.");'
  + source.slice(last + end.length);
fs.writeFileSync(file, repaired);
console.log("Removed automatic doctor repair only; preserved all other startup logic.");


// Keep the setup wizard's initial provider/model consistent with JARVIS's
// existing Google Gemini deployment. This changes UI defaults only; it never
// reads, replaces, or activates any saved authentication profile.
const setupFile = "/app/src/public/setup.html";
const setup = fs.readFileSync(setupFile, "utf8");
const oldDefault = "this.selectedGroup = this.authGroups[0].value;";
const newDefault = "this.selectedGroup = this.authGroups.some(g => g.value === 'google') ? 'google' : this.authGroups[0].value;";
if (setup.split(oldDefault).length !== 2) {
  throw new Error("Pinned template setup provider default was not found exactly once.");
}
const oldModel = "      model: '',";
const newModel = "      model: 'google/gemini-3-flash-preview',";
if (setup.split(oldModel).length !== 2) {
  throw new Error("Pinned template setup model default was not found exactly once.");
}
fs.writeFileSync(setupFile, setup.replace(oldDefault, newDefault).replace(oldModel, newModel));
console.log("Set Google Gemini wizard defaults; preserved persistent configuration and credentials.");


// The upstream setup UI always resets provider to the first entry (Anthropic).
// Prefer Google when available and reject mismatched provider/model selections.
const setupFile = "/app/src/public/setup.html";
let setup = fs.readFileSync(setupFile, "utf8");
const oldSelection = "this.selectedGroup = this.authGroups[0].value;";
const newSelection = "this.selectedGroup = this.authGroups.find(g => g.value === 'google')?.value || this.authGroups[0].value;";
if (setup.split(oldSelection).length !== 2) throw new Error("Expected one setup default provider selector.");
setup = setup.replace(oldSelection, newSelection);
const oldSubmit = "        this.setupError = '';\n        this.setupStreamTail = '';\n        const payload = {";
const newSubmit = `        if (this.selectedGroup === 'google' && this.model && !this.model.startsWith('google/')) {
          this.setupError = 'For Google select a model like google/gemini-3-flash-preview.';
          return;
        }
        if (this.model && this.model.includes('/') && this.selectedGroup !== this.model.split('/')[0]) {
          this.setupError = 'Selected provider and model do not match. Check Model & Authentication.';
          return;
        }
        this.setupError = '';
        this.setupStreamTail = '';
        const payload = {`;
if (setup.split(oldSubmit).length !== 2) throw new Error("Expected one setup submission handler.");
setup = setup.replace(oldSubmit, newSubmit);
fs.writeFileSync(setupFile, setup);
console.log("Setup now defaults to Google and blocks mismatched provider/model submissions.");
