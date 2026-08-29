import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GitResult = { stdout: string; stderr: string };

/**
 * A `git` invocation failed (non-zero exit, or `git`/the given `cwd` could
 * not be spawned at all). Carries the raw underlying message for callers
 * that want to log it, but PlaybookDiff's user-facing error paths translate
 * this into a clean, git-stderr-free message rather than surfacing it as-is.
 */
export class GitCommandError extends Error {
  constructor(
    readonly args: readonly string[],
    message: string,
  ) {
    super(message);
    this.name = "GitCommandError";
  }
}

/**
 * Runs `git` with explicit argument-array passing (never shell string
 * interpolation), so revision names and paths can never be interpreted as
 * shell syntax.
 */
export async function runGit(
  args: readonly string[],
  options: { cwd: string },
): Promise<GitResult> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd: options.cwd,
      encoding: "utf8",
    });
    return { stdout, stderr };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new GitCommandError(args, message);
  }
}
