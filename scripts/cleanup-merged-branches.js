import { appendFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_MIN_AGE_DAYS = 7;

export function selectMergedBranches(
  branches,
  pullRequests,
  repository,
  defaultBranch,
  { nowMs = Date.now(), minAgeDays = DEFAULT_MIN_AGE_DAYS } = {}
) {
  if (!Number.isFinite(nowMs)) throw new Error("Invalid cleanup clock");
  if (!Number.isFinite(minAgeDays) || minAgeDays < 0) throw new Error("Invalid minimum branch age");

  const minAgeMs = minAgeDays * DAY_MS;

  return branches.flatMap(branch => {
    if (branch.name === defaultBranch || branch.protected) return [];

    const ownPullRequests = pullRequests.filter(pr =>
      pr.head?.repo?.full_name === repository && pr.head.ref === branch.name
    );

    if (ownPullRequests.some(pr => pr.state === "open")) return [];

    const merged = ownPullRequests.find(pr => {
      if (
        pr.state !== "closed" ||
        !pr.merged_at ||
        pr.base?.repo?.full_name !== repository ||
        pr.base.ref !== defaultBranch ||
        pr.head.sha !== branch.commit.sha
      ) {
        return false;
      }

      const mergedAtMs = Date.parse(pr.merged_at);
      return Number.isFinite(mergedAtMs) && nowMs - mergedAtMs >= minAgeMs;
    });

    return merged
      ? [{ name: branch.name, sha: branch.commit.sha, pullRequest: merged.number }]
      : [];
  });
}

export function deleteMergedBranch(branch, cwd = process.cwd()) {
  const ref = `refs/heads/${branch.name}`;
  if (!/^[a-f0-9]{40}$/.test(branch.sha)) throw new Error("Invalid expected commit SHA");
  execFileSync("git", ["check-ref-format", ref], { cwd, stdio: "pipe" });

  // The server must still have exactly the inspected SHA. A concurrent push
  // therefore rejects the deletion instead of discarding new work.
  execFileSync("git", ["push", `--force-with-lease=${ref}:${branch.sha}`, "--delete", "origin", ref], {
    cwd,
    stdio: "pipe"
  });
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const apply = process.argv.includes("--apply");
  const minAgeDays = Number(process.env.CLEANUP_MIN_AGE_DAYS || DEFAULT_MIN_AGE_DAYS);

  if (!repository) throw new Error("GITHUB_REPOSITORY is required");
  if (apply && !token) throw new Error("GITHUB_TOKEN is required for deletion");
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("Invalid repository");
  if (!Number.isFinite(minAgeDays) || minAgeDays < 0) throw new Error("Invalid CLEANUP_MIN_AGE_DAYS");

  const apiBase = `https://api.github.com/repos/${repository}`;

  async function api(path) {
    const response = await fetch(path ? `${apiBase}/${path}` : apiBase, {
      headers: {
        accept: "application/vnd.github+json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        "X-GitHub-Api-Version": "2022-11-28"
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000)
    });

    if (!response.ok) throw new Error(`GitHub read failed: HTTP ${response.status}`);
    return response.json();
  }

  async function list(path) {
    const items = [];

    for (let page = 1; ; page++) {
      const separator = path.includes("?") ? "&" : "?";
      const batch = await api(`${path}${separator}per_page=100&page=${page}`);
      items.push(...batch);
      if (batch.length < 100) return items;
    }
  }

  const metadata = await api("");

  if (apply) {
    if (process.env.GITHUB_REF !== `refs/heads/${metadata.default_branch}`) {
      throw new Error("Deletion is allowed only from the default branch");
    }

    const origin = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8"
    }).trim();

    if (![metadata.clone_url, metadata.html_url].includes(origin)) {
      throw new Error("Git origin does not match the inspected repository");
    }
  }

  const [branches, pullRequests] = await Promise.all([
    list("branches"),
    list("pulls?state=all")
  ]);

  const candidates = selectMergedBranches(
    branches,
    pullRequests,
    repository,
    metadata.default_branch,
    { minAgeDays }
  );

  console.log(
    `${apply ? "Cleanup" : "Preview"}: ${candidates.length} unchanged merged branches qualify after a ${minAgeDays}-day cooling-off period.`
  );

  let deleted = 0;

  for (const branch of candidates) {
    console.log(JSON.stringify(branch));

    if (!apply) continue;

    const current = await api(`branches/${encodeURIComponent(branch.name)}`);
    const open = await api(
      `pulls?state=open&head=${encodeURIComponent(`${metadata.owner.login}:${branch.name}`)}&per_page=1`
    );

    if (current.protected || current.commit.sha !== branch.sha || open.length) {
      console.log(`Preserved changed, protected or active branch: ${branch.name}`);
      continue;
    }

    deleteMergedBranch(branch);
    deleted++;
  }

  const summary =
    `${apply ? `Deleted ${deleted}` : `Previewed ${candidates.length}`} unchanged branches whose pull requests were merged into ${metadata.default_branch} at least ${minAgeDays} days ago.\n`;

  console.log(summary);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
