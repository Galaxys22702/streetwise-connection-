import { execFileSync } from "node:child_process";

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const before = process.env.PUSH_BEFORE;
const after = process.env.PUSH_AFTER;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (!repository || !token) {
  fail("Missing GitHub Actions repository/token context");
} else if (!/^[a-f0-9]{40}$/.test(before || "") || !/^[a-f0-9]{40}$/.test(after || "")) {
  fail("Invalid push SHAs");
} else if (/^0{40}$/.test(before)) {
  fail("Ref creation is not an allowed main update path");
} else {
  const [owner, repo] = repository.split("/");
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };

  let trusted = false;
  let lastStatus = null;
  for (let attempt = 1; attempt <= 5 && !trusted; attempt++) {
    const response = await fetch(`${apiBase}/commits/${after}/pulls`, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(15000)
    });
    lastStatus = response.status;
    if (response.ok) {
      const prs = await response.json();
      trusted = prs.some(pr =>
        pr.state === "closed" &&
        pr.merged_at &&
        pr.merge_commit_sha === after &&
        pr.base?.ref === "main" &&
        pr.base?.repo?.full_name === repository
      );
    }
    if (!trusted && attempt < 5) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (lastStatus !== 200 && !trusted) {
    fail(`Unable to verify push provenance: HTTP ${lastStatus}`);
  } else {
    if (trusted) {
      console.log("Trusted main update: head commit is the merge commit of a PR merged into main.");
    } else {
      console.error("Untrusted direct update detected on main. Restoring previous trusted SHA.");
      const ref = "refs/heads/main";
      execFileSync("git", ["fetch", "--no-tags", "origin", before], { stdio: "inherit" });
      execFileSync("git", [
        "push",
        `--force-with-lease=${ref}:${after}`,
        "origin",
        `${before}:${ref}`
      ], { stdio: "inherit" });
      process.exitCode = 1;
    }
  }
}
