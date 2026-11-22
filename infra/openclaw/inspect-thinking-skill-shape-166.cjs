'use strict';
// Issue #166: report ONLY enum categories of persisted skill frontmatter.
// No file contents, path, IDs, secrets, hashes, or raw YAML fields are logged.
// No writes, automatic repairs, or network calls.
const fs = require('node:fs');
const path = require('node:path');
const filename = 'SKILL.md';
const maxBytes = 128 * 1024;

function shape(source) {
  if (typeof source !== 'string') return {status:'unrecognized',reason:'non_text'};
  const bom = source.charCodeAt(0) === 0xfeff;
  const crlf = source.includes('\r\n');
  const normalized = (bom ? source.slice(1) : source).replace(/\r\n/g,'\n');
  if (!normalized.startsWith('---\n')) return {status:'unrecognized',reason:'missing_frontmatter',bom,crlf};
  const closing = normalized.indexOf('\n---\n',4);
  if (closing < 0) return {status:'unrecognized',reason:'unclosed_frontmatter',bom,crlf};
  if (closing > 4096) return {status:'unrecognized',reason:'oversized_frontmatter',bom,crlf};
  const lines = normalized.slice(4,closing).split('\n');
  const name = lines.find(line => /^name\s*:/.test(line));
  if (!name) return {status:'unrecognized',reason:'name_missing',bom,crlf};
  const value = name.slice(name.indexOf(':') + 1).trim().replace(/^(["'])(.*?)\1$/,'$2');
  if (value !== 'thinking-frameworks') return {status:'unrecognized',reason:'name_mismatch',bom,crlf};
  const desc = lines.find(line => /^description\s*:/.test(line));
  const hasDesc = desc !== undefined;
  const val = hasDesc ? desc.slice(desc.indexOf(':') + 1).trim() : '';
  const emptyDesc = val === '' || val === "''" || val === '""';
  // A valid description is only a field-shape signal, not a claim OpenClaw loads it.
  const status = !hasDesc ? 'description_missing' : emptyDesc ? 'description_empty' : 'description_present';
  const reason = bom ? 'utf8_bom' : crlf ? 'crlf_line_endings' : 'canonical_lf';
  return {status,reason,bom,crlf};
}

function inspect({directory = '/data/workspace/skills/thinking-frameworks',allowedRoot = '/data'} = {}) {
  if (directory !== path.join(allowedRoot,'workspace','skills','thinking-frameworks'))
    return {status:'unavailable',reason:'disallowed_path'};
  let fd;
  try {
    const ancestors=[allowedRoot,path.join(allowedRoot,'workspace'),path.join(allowedRoot,'workspace','skills'),directory];
    for (const ancestor of ancestors) {
      const stat=fs.lstatSync(ancestor);
      if (!stat.isDirectory() || stat.isSymbolicLink()) return {status:'unavailable',reason:'unsafe_path'};
    }
    const target=path.join(directory,filename);
    const info=fs.lstatSync(target);
    if (!info.isFile() || info.isSymbolicLink() || info.size>maxBytes)
      return {status:'unavailable',reason:'unsafe_file'};
    fd=fs.openSync(target,fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const check=fs.fstatSync(fd);
    if (!check.isFile() || check.size>maxBytes || check.dev!==info.dev || check.ino!==info.ino)
      return {status:'unavailable',reason:'unsafe_file'};
    return shape(fs.readFileSync(fd,'utf8'));
  } catch {
    return {status:'unavailable',reason:'read_failed'};
  } finally {if(fd!==undefined)try{fs.closeSync(fd);}catch{/* no-op */}}
}
if (require.main===module) {
  // Stable enums only. Never include contents, path, file size, timestamps or identifiers.
  console.log('[JARVIS] Read-only thinking skill format: '+JSON.stringify(inspect())+'.');
}
module.exports={shape,inspect};
