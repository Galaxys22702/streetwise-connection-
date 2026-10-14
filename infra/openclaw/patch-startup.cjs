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
