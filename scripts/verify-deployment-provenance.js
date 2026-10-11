const env = process.env.VERCEL_ENV;
const sha = process.env.VERCEL_GIT_COMMIT_SHA;
const ref = process.env.VERCEL_GIT_COMMIT_REF;
const repoSlug = process.env.VERCEL_GIT_REPO_SLUG;
const owner = process.env.VERCEL_GIT_REPO_OWNER;

if (env !== "production") {
  console.log("Deployment provenance check skipped outside production.");
  process.exit(0);
}

// Vercel's Git integration provides these values from the deployment source.
// Do not call GitHub's unauthenticated API during the production build: that
// can be rate-limited (HTTP 403) and would incorrectly block a trusted build.
if (!/^[a-f0-9]{40}$/.test(sha || "")) {
  console.error("Production deployment is missing a trusted Git commit SHA.");
  process.exit(1);
}

if (ref !== "main") {
  console.error("Blocked production deployment: only the main branch may deploy to production.");
  process.exit(1);
}

if (owner !== "Galaxys22702" || repoSlug !== "streetwise-connection-") {
  console.error("Blocked production deployment: unexpected Git repository metadata.");
  process.exit(1);
}

console.log("Production deployment provenance verified from trusted Vercel Git metadata.");
