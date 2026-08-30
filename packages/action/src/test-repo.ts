import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * A disposable local Git repository for Action tests. Duplicated from
 * `packages/cli/src/git/test-repo.ts` rather than imported: it is test-only
 * scaffolding, not part of the published `playbookdiff` package's API
 * surface, and this package should not reach into another package's `src/`.
 */
export type TestGitRepo = {
  root: string;
  writeFile(relativePath: string, content: string): Promise<void>;
  removeFile(relativePath: string): Promise<void>;
  commitAll(message: string): Promise<string>;
  cleanup(): Promise<void>;
};

const COMMIT_CONFIG = [
  "-c",
  "user.name=PlaybookDiff Test",
  "-c",
  "user.email=test@example.invalid",
  "-c",
  "commit.gpgsign=false",
];

async function git(cwd: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, encoding: "utf8" });
  return stdout;
}

export async function createTestGitRepo(): Promise<TestGitRepo> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "playbookdiff-action-test-repo-"));
  await git(root, ["init", "--quiet", "-b", "main"]);

  async function writeFile(relativePath: string, content: string): Promise<void> {
    const absolutePath = path.join(root, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");
  }

  async function removeFile(relativePath: string): Promise<void> {
    await fs.rm(path.join(root, relativePath), { force: true });
  }

  async function commitAll(message: string): Promise<string> {
    await git(root, ["add", "-A"]);
    await git(root, [...COMMIT_CONFIG, "commit", "--quiet", "-m", message]);
    return (await git(root, ["rev-parse", "HEAD"])).trim();
  }

  async function cleanup(): Promise<void> {
    await fs.rm(root, { recursive: true, force: true }).catch(() => {});
  }

  return { root, writeFile, removeFile, commitAll, cleanup };
}
