import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

if (config.framework !== null) {
  throw new Error('vercel_framework_must_be_other');
}
if (config.outputDirectory !== 'dist') {
  throw new Error('vercel_output_directory_must_be_dist');
}

const buildCommand = String(config.buildCommand || '');
const expectedBuildCommand =
  'node scripts/verify-deployment-provenance.js && ' +
  'node scripts/test-project.js && ' +
  'node scripts/launch-readiness-check.js && npm run build';
if (buildCommand !== expectedBuildCommand) {
  throw new Error('vercel_build_command_must_use_verified_local_builder');
}
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (packageJson.scripts?.build !== 'node scripts/build-site.js') {
  throw new Error('vercel_build_script_must_use_static_site_builder');
}

const rewrites = Array.isArray(config.rewrites) ? config.rewrites : [];
const apiRewrite = rewrites.find((rule) => rule.source === '/api/:path*');
if (apiRewrite?.destination !== '/api/[...path]') {
  throw new Error('vercel_nested_api_splat_rewrite_required');
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
if (headerMap.get('strict-transport-security') !== 'max-age=63072000; includeSubDomains; preload') {
  throw new Error('vercel_hsts_required');
}
if (headerMap.get('permissions-policy') !== 'camera=(), microphone=(), geolocation=(), payment=()') {
  throw new Error('vercel_default_device_permissions_must_remain_disabled');
}
const voiceHeaders = config.headers.filter(rule => rule.source !== '/(.*)')
  .flatMap(rule => (rule.headers || [])
    .filter(header => String(header.key).toLowerCase() === 'permissions-policy')
    .map(header => ({ source: rule.source, value: header.value })));
const permittedVoicePages = ['/jarvis.html', '/network-lab.html'];
const scopedVoicePolicy = 'camera=(), microphone=(self), geolocation=(), payment=()';
if (voiceHeaders.length !== permittedVoicePages.length ||
    voiceHeaders.some(({ source, value }) => !permittedVoicePages.includes(source) || value !== scopedVoicePolicy) ||
    new Set(voiceHeaders.map(({ source }) => source)).size !== permittedVoicePages.length) {
  throw new Error('vercel_microphone_must_be_scoped_to_approved_pages');
}

console.log('Vercel config is static/API-only, side-effect free during build, routes nested API paths, and includes required public security headers.');
