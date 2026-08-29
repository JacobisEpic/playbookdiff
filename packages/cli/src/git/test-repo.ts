import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { runGit } from "./exec.js";

/**
 * A disposable local Git repository for Phase 6 tests. Not fixture data
 * checked into the repo: PlaybookDiff's Git regression analysis needs real
 * commit history, which is easiest to build fresh per test rather than
 * maintaining checked-in `.git` history.
 */
export type TestGitRepo = {
  root: string;
  writeFile(relativePath: string, content: string): Promise<void>;
  removeFile(relativePath: string): Promise<void>;
  commitAll(message: string): Promise<string>;
  currentCommit(): Promise<string>;
  cleanup(): Promise<void>;
};

/** Config flags applied to every commit so tests never depend on the host's global Git config. */
const COMMIT_CONFIG = [
  "-c",
  "user.name=PlaybookDiff Test",
  "-c",
  "user.email=test@example.invalid",
  "-c",
  "commit.gpgsign=false",
];

export async function createTestGitRepo(): Promise<TestGitRepo> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "playbookdiff-test-repo-"));
  await runGit(["init", "--quiet", "-b", "main"], { cwd: root });

  async function writeFile(relativePath: string, content: string): Promise<void> {
    const absolutePath = path.join(root, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");
  }

  async function removeFile(relativePath: string): Promise<void> {
    await fs.rm(path.join(root, relativePath), { force: true });
  }

  async function commitAll(message: string): Promise<string> {
    await runGit(["add", "-A"], { cwd: root });
    await runGit([...COMMIT_CONFIG, "commit", "--quiet", "-m", message], { cwd: root });
    return currentCommit();
  }

  async function currentCommit(): Promise<string> {
    const { stdout } = await runGit(["rev-parse", "HEAD"], { cwd: root });
    return stdout.trim();
  }

  async function cleanup(): Promise<void> {
    await fs.rm(root, { recursive: true, force: true }).catch(() => {});
  }

  return { root, writeFile, removeFile, commitAll, currentCommit, cleanup };
}
