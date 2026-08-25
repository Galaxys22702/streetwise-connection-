import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

if (config.framework !== null) {
  throw new Error('vercel_framework_must_be_other');
}
if (config.outputDirectory !== 'dist') {
  throw new Error('vercel_output_directory_must_be_dist');
}
if (!String(config.buildCommand || '').includes('public')) {
  throw new Error('vercel_build_command_must_copy_public');
}

console.log('Vercel config is pinned to Other/static + API functions.');
