import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { runGit } from "./exec.js";
import { resolveRevision } from "./revisions.js";

/**
 * `git worktree add` performs a checkout, which by default runs the
 * repository's own `post-checkout` hook - PlaybookDiff must never execute
 * code from an analyzed repository, so hooks are disabled by pointing
 * `core.hooksPath` at an empty directory for this call only.
 */
async function addWorktree(
  repository: string,
  commit: string,
  directory: string,
  emptyHooksDir: string,
): Promise<void> {
  await runGit(
    [
      "-c",
      `core.hooksPath=${emptyHooksDir}`,
      "worktree",
      "add",
      "--detach",
      "--quiet",
      directory,
      commit,
    ],
    { cwd: repository },
  );
}

async function removeWorktree(repository: string, directory: string): Promise<void> {
  try {
    await runGit(["worktree", "remove", "--force", directory], { cwd: repository });
  } catch {
    // Best-effort fallback: the worktree directory and administrative
    // metadata are removed directly, then `prune` reconciles Git's records.
    await fs.rm(directory, { recursive: true, force: true }).catch(() => {});
    await runGit(["worktree", "prune"], { cwd: repository }).catch(() => {});
  }
}

/**
 * Resolves `revision` to a commit and checks it out into a disposable
 * detached worktree for the duration of `fn`, then removes the worktree and
 * its temporary directory, in a `finally` so cleanup runs on both success and
 * failure. This never touches `repository`'s active branch, HEAD, index, or
 * working tree - a detached worktree is a separate checkout with its own
 * index, entirely independent of the one the user has open.
 */
export async function withMaterializedRevision<T>(
  repository: string,
  revision: string,
  label: "baseline" | "candidate",
  fn: (directory: string, commit: string) => Promise<T>,
): Promise<T> {
  const commit = await resolveRevision(repository, revision, label);
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), `playbookdiff-${label}-`));
  const directory = path.join(parent, "snapshot");
  const emptyHooksDir = path.join(parent, "no-hooks");
  try {
    await fs.mkdir(emptyHooksDir);
    await addWorktree(repository, commit, directory, emptyHooksDir);
    try {
      return await fn(directory, commit);
    } finally {
      await removeWorktree(repository, directory);
    }
  } finally {
    await fs.rm(parent, { recursive: true, force: true }).catch(() => {});
  }
}
