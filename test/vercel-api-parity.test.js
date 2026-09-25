import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const apiSource = await readFile(
  new URL("../api/[...path].js", import.meta.url),
  "utf8"
);

test("Vercel eSIM detail routes pass authenticated user context", () => {
  assert.match(
    apiSource,
    /getEsimOrder\([\s\S]*?refresh:\s*url\.searchParams\.get\("refresh"\)\s*===\s*"true"[\s\S]*?userId:\s*user\.id/
  );
  assert.match(
    apiSource,
    /getEsimInstallDetails\([\s\S]*?userId:\s*user\.id/
  );
  assert.match(apiSource, /error:\s*"order_not_found"/);
  assert.match(apiSource, /error:\s*"install_details_not_found"/);
});


test("Vercel authentication routes enforce the same abuse limits as Node", () => {
  assert.match(
    apiSource,
    /import\s+\{\s*enforceRateLimit\s*\}\s+from\s+"\.\.\/src\/services\/requestRateLimit\.js"/
  );
  assert.match(
    apiSource,
    /\/api\/auth\/register"[\s\S]*?enforceRateLimit\(req,\s*\{\s*scope:\s*"auth_register",\s*maxAttempts:\s*5\s*\}\)/
  );
  assert.match(
    apiSource,
    /\/api\/auth\/login"[\s\S]*?enforceRateLimit\(req,\s*\{\s*scope:\s*"auth_login",\s*maxAttempts:\s*10\s*\}\)/
  );
});
