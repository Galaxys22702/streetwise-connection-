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

const globalHeaders = config.headers?.find((rule) => rule.source === '/(.*)')?.headers || [];
const headerMap = new Map(
  globalHeaders.map(({ key, value }) => [String(key).toLowerCase(), String(value)])
);

if (!headerMap.get('content-security-policy')?.includes("default-src 'self'")) {
  throw new Error('vercel_content_security_policy_required');
}
if (headerMap.get('cross-origin-opener-policy') !== 'same-origin') {
  throw new Error('vercel_cross_origin_opener_policy_required');
}
if (headerMap.get('cross-origin-resource-policy') !== 'same-origin') {
  throw new Error('vercel_cross_origin_resource_policy_required');
}
if (headerMap.get('x-content-type-options') !== 'nosniff') {
  throw new Error('vercel_nosniff_required');
}
if (headerMap.get('x-frame-options') !== 'DENY') {
  throw new Error('vercel_frame_denial_required');
}
if (headerMap.get('referrer-policy') !== 'no-referrer') {
  throw new Error('vercel_referrer_policy_required');
}

console.log('Vercel config is pinned to Other/static + API functions with required public security headers.');
