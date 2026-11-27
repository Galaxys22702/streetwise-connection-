'use strict';
const fs = require('node:fs');
const path = require('node:path');

function install(workspace) {
  if (typeof workspace !== 'string' || !path.isAbsolute(workspace)) {
    throw new Error('Provide the absolute path of an existing OpenClaw workspace.');
  }
  const root = fs.realpathSync(workspace);
  if (!fs.statSync(root).isDirectory()) throw new Error('Workspace must be a directory.');
  const source = path.join(__dirname, '..', 'infra', 'openclaw', 'guardian-infinite-general', 'SKILL.md');
  const data = fs.readFileSync(source, 'utf8');
  if (!data.startsWith('---\nname: guardian-infinite-general\n')) throw new Error('Invalid bundled skill.');
  const parent = path.join(root, 'skills');
  try { fs.mkdirSync(parent, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  if (fs.lstatSync(parent).isSymbolicLink() || !fs.lstatSync(parent).isDirectory()) {
    throw new Error('Refusing a redirected or invalid skills directory.');
  }
  const target = path.join(parent, 'guardian-infinite-general');
  fs.mkdirSync(target, { mode: 0o700 }); // refuses existing directories, including links
  const file = path.join(target, 'SKILL.md');
  fs.writeFileSync(file, data, { flag: 'wx', mode: 0o600 });
  return file;
}

if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/install-guardian-skill.cjs <absolute-workspace-directory>');
    console.log('Skill installed:', install(process.argv[2]));
    console.log('Gateway activation and inference are not verified.');
  } catch (error) {
    console.error('Install stopped:', error.code === 'EEXIST' ? 'Existing skill preserved.' : error.message);
    process.exitCode = 1;
  }
}
module.exports = { install };
