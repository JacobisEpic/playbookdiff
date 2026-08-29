import { promises as fs } from "node:fs";
import { GitCommandError, runGit } from "./exec.js";

/** `diff`'s repository argument is not usable: missing, not a directory, or not a Git working tree. */
export class GitRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitRepositoryError";
  }
}

/**
 * Confirms `repository` exists, is a directory, and is a Git working tree,
 * without fetching, initializing, or otherwise mutating it.
 */
export async function assertGitWorkTree(repository: string): Promise<void> {
  let stat;
  try {
    stat = await fs.stat(repository);
  } catch {
    throw new GitRepositoryError(`repository does not exist: ${repository}`);
  }
  if (!stat.isDirectory()) {
    throw new GitRepositoryError(`repository is not a directory: ${repository}`);
  }

  try {
    const { stdout } = await runGit(["rev-parse", "--is-inside-work-tree"], { cwd: repository });
    if (stdout.trim() !== "true") {
      throw new GitRepositoryError(`repository is not a Git working tree: ${repository}`);
    }
  } catch (error) {
    if (error instanceof GitRepositoryError) throw error;
    if (error instanceof GitCommandError) {
      throw new GitRepositoryError(`repository is not a Git working tree: ${repository}`);
    }
    throw error;
  }
}
