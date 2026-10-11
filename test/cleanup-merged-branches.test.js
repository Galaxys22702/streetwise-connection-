import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_MIN_AGE_DAYS,
  selectMergedBranches,
  deleteMergedBranch
} from "../scripts/cleanup-merged-branches.js";

const gitAvailable =
  spawnSync("git", ["--version"], { stdio: "ignore" }).status === 0;

const repository = "owner/project";
const sha = "a".repeat(40);
const branch = { name: "finished", protected: false, commit: { sha } };
const nowMs = Date.parse("2026-09-21T12:00:00Z");

const merged = {
  number: 1,
  state: "closed",
  merged_at: "2026-09-01T00:00:00Z",
  head: {
    ref: branch.name,
    sha,
    repo: { full_name: repository }
  },
  base: {
    ref: "main",
    repo: { full_name: repository }
  }
};

const select = (branches, prs, options = {}) =>
  selectMergedBranches(
    branches,
    prs,
    repository,
    "main",
    { nowMs, ...options }
  );

test("cleanup uses a seven-day cooling-off period by default", () => {
  assert.equal(DEFAULT_MIN_AGE_DAYS, 7);

  assert.deepEqual(
    select([branch], [
      { ...merged, merged_at: "2026-09-18T00:00:00Z" }
    ]),
    []
  );
});

test("cleanup selects unchanged merged PR branches after the cooling-off period", () => {
  assert.deepEqual(
    select([branch], [merged]),
    [{ name: "finished", sha, pullRequest: 1 }]
  );
});

test("cleanup preserves main, protected branches and commits added after merging", () => {
  assert.deepEqual(
    select(
      [
        { ...branch, name: "main" },
        { ...branch, protected: true },
        { ...branch, commit: { sha: "b".repeat(40) } }
      ],
      [merged]
    ),
    []
  );
});

test("cleanup preserves branches with open PRs and branches without a merged PR", () => {
  assert.deepEqual(
    select(
      [branch],
      [
        merged,
        { ...merged, state: "open", merged_at: null }
      ]
    ),
    []
  );

  assert.deepEqual(select([branch], [{ ...merged, merged_at: null }]), []);
  assert.deepEqual(select([branch], []), []);
});

test("cleanup preserves a merged branch used as the base of an open stacked PR", () => {
  const dependent = {
    number: 2,
    state: "open",
    merged_at: null,
    head: {
      ref: "stacked-work",
      sha: "b".repeat(40),
      repo: { full_name: repository }
    },
    base: {
      ref: branch.name,
      repo: { full_name: repository }
    }
  };

  assert.deepEqual(select([branch], [merged, dependent]), []);
});

test("cleanup does not confuse fork branches or merges into another base", () => {
  assert.deepEqual(
    select([branch], [
      {
        ...merged,
        head: {
          ...merged.head,
          repo: { full_name: "fork/project" }
        }
      },
      {
        ...merged,
        base: { ...merged.base, ref: "experiment" }
      },
      {
        ...merged,
        base: {
          ...merged.base,
          repo: { full_name: "fork/project" }
        }
      }
    ]),
    []
  );
});

test("cleanup rejects invalid age configuration", () => {
  assert.throws(() =>
    selectMergedBranches(
      [branch],
      [merged],
      repository,
      "main",
      { nowMs, minAgeDays: -1 }
    )
  );
});

function gitFixture(t) {
  const root = mkdtempSync(join(tmpdir(), "streetwise-cleanup-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const remote = join(root, "remote.git");
  const cwd = join(root, "work");

  const run = (...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();

  execFileSync(
    "git",
    ["init", "--bare", "--initial-branch=main", remote],
    { stdio: "pipe" }
  );

  execFileSync("git", ["clone", remote, cwd], { stdio: "pipe" });

  run("config", "user.name", "Maintenance test");
  run("config", "user.email", "maintenance@example.invalid");

  writeFileSync(join(cwd, "sample.txt"), "initial\n");
  run("add", "sample.txt");
  run("commit", "-m", "initial");
  run("switch", "-c", "finished");
  run("push", "origin", "main", "finished");

  return {
    cwd,
    run,
    candidate: {
      name: "finished",
      sha: run("rev-parse", "HEAD")
    }
  };
}

test(
  "Git deletion removes the expected branch and preserves main",
  { skip: !gitAvailable },
  t => {
    const { cwd, run, candidate } = gitFixture(t);

    deleteMergedBranch(candidate, cwd);

    assert.equal(
      run("ls-remote", "--heads", "origin", "finished"),
      ""
    );

    assert.match(
      run("ls-remote", "--heads", "origin", "main"),
      /refs\/heads\/main$/
    );
  }
);

test(
  "Git deletion refuses a branch that received a concurrent commit",
  { skip: !gitAvailable },
  t => {
    const { cwd, run, candidate } = gitFixture(t);

    writeFileSync(join(cwd, "sample.txt"), "new work\n");
    run("commit", "-am", "work after inspection");
    run("push", "origin", "finished");

    assert.throws(() => deleteMergedBranch(candidate, cwd));

    assert.match(
      run("ls-remote", "--heads", "origin", "finished"),
      new RegExp(run("rev-parse", "HEAD"))
    );
  }
);
