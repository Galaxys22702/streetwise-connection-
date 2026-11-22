'use strict';
// Issue #166: inspect only SQLite session thinking metadata.
// No session IDs, message content, SQL write queries, paths, or credentials in output.
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { sqliteSessionFiles } = require('./configure-free-chat.cjs');
function inspect(stateDir) {
  const summary = { sqliteStores: 0, unreadable: 0, off: 0, minimal: 0,
    other: 0, unset: 0, locked: 0, invalidRows: 0 };
  const files = sqliteSessionFiles(stateDir, null);
  for (const file of files) {
    summary.sqliteStores++;
    let db;
    try {
      db = new DatabaseSync(file, { readOnly: true, timeout: 2000 });
      db.exec('PRAGMA query_only = ON');
      const columns = new Set(db.prepare('PRAGMA table_info(session_nodes)').all().map(r => r.name));
      if (!columns.has('entry_json') || !columns.has('entry_valid')) throw Error('unsupported');
      const query = `SELECT entry_valid AS valid, json_valid(entry_json) AS json_ok,
         CASE WHEN entry_valid=1 AND json_valid(entry_json)=1
              THEN json_extract(entry_json, '$.thinkingLevel') ELSE NULL END AS thinking,
         CASE WHEN entry_valid=1 AND json_valid(entry_json)=1
              THEN json_extract(entry_json, '$.modelSelectionLocked') ELSE NULL END AS locked
         FROM session_nodes`;
      for (const row of db.prepare(query).iterate()) {
        if (row.valid !== 1 || row.json_ok !== 1) {
          summary.invalidRows++;
          continue;
        }
        const level = row.thinking;
        summary[level == null ? 'unset' : level === 'off' || level === 'minimal' ? level : 'other']++;
        if (row.locked === 1 || row.locked === 'true') summary.locked++;
      }
    } catch {
      summary.unreadable++;
    } finally {
      if (db) try { db.close(); } catch { /* no change to database */ }
    }
  }
  return summary;
}
if (require.main === module) {
  try {
    const stateDir = process.env.OPENCLAW_STATE_DIR || path.join('/data', '.openclaw');
    console.log('[JARVIS] Read-only SQLite thinking audit: ' + JSON.stringify(inspect(stateDir)) + '.');
  } catch {
    console.log('[JARVIS] Read-only SQLite thinking audit: {"status":"unavailable"}.');
  }
}
module.exports = { inspect };
