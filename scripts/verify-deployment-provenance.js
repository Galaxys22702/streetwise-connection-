const env = process.env.VERCEL_ENV;
const sha = process.env.VERCEL_GIT_COMMIT_SHA;
const repoSlug = process.env.VERCEL_GIT_REPO_SLUG;
const owner = process.env.VERCEL_GIT_REPO_OWNER;

if (env !== "production") {
  console.log("Deployment provenance check skipped outside production.");
  process.exit(0);
}

if (!/^[a-f0-9]{40}$/.test(sha || "") || !repoSlug || !owner) {
  console.error("Production deployment is missing trusted Git metadata.");
  process.exit(1);
}

const repository = `${owner}/${repoSlug}`;
let trusted = false;
let lastStatus = null;
for (let attempt = 1; attempt <= 5 && !trusted; attempt++) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/commits/${sha}/pulls`,
    {
      headers: {
        accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "streetwise-deployment-provenance"
      },
      redirect: "error",
      signal: AbortSignal.timeout(15000)
    }
  );
  lastStatus = response.status;
  if (response.ok) {
    const prs = await response.json();
    trusted = prs.some(pr =>
      pr.state === "closed" &&
      pr.merged_at &&
      pr.merge_commit_sha === sha &&
      pr.base?.ref === "main" &&
      pr.base?.repo?.full_name === repository
    );
  }
  if (!trusted && attempt < 5) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

if (lastStatus !== 200 && !trusted) {
  console.error(`Unable to verify production deployment provenance: HTTP ${lastStatus}`);
  process.exit(1);
}

if (!trusted) {
  console.error("Blocked production deployment: commit is not a PR merge into main.");
  process.exit(1);
}

console.log("Production deployment provenance verified.");
