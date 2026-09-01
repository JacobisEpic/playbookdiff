import { runGit } from "./exec.js";

/**
 * Repository paths that differ between two already-resolved commits.
 *
 * Both sides of a rename or copy are reported. Git expresses a rename as one
 * entry with an old and a new path, and the two can sit in different
 * directories governed by different configuration, so dropping either side
 * would lose a scope that genuinely changed. Reporting both cannot double-count
 * a regression: derived analysis targets are deduplicated by effective scope,
 * and the delta itself is taken over stable finding IDs.
 *
 * Reads only local object data between commits the caller already resolved. It
 * never fetches, never touches the working tree, and never runs repository
 * code.
 */
export async function listChangedPaths(
  repository: string,
  baselineCommit: string,
  candidateCommit: string,
): Promise<string[]> {
  const { stdout } = await runGit(
    [
      "diff",
      "--name-status",
      "--find-renames",
      "--find-copies",
      "-z",
      "--no-textconv",
      "--no-ext-diff",
      baselineCommit,
      candidateCommit,
    ],
    { cwd: repository },
  );
  return parseNameStatusZ(stdout);
}

/**
 * Parses `git diff --name-status -z` output.
 *
 * The `-z` form is NUL-separated rather than newline-separated and leaves
 * paths completely unquoted and unescaped, so a path containing a newline,
 * quote, or non-ASCII byte parses correctly instead of arriving mangled.
 * Status codes are followed by one path, except `R`/`C`, which carry a
 * similarity score and are followed by two.
 */
export function parseNameStatusZ(stdout: string): string[] {
  const fields = stdout.split("\0");
  const paths: string[] = [];
  let index = 0;
  while (index < fields.length) {
    const status = fields[index];
    index += 1;
    if (status === undefined || status.length === 0) {
      continue;
    }
    const followedByTwoPaths = status.startsWith("R") || status.startsWith("C");
    const expected = followedByTwoPaths ? 2 : 1;
    for (let taken = 0; taken < expected; taken += 1) {
      const value = fields[index];
      index += 1;
      if (value !== undefined && value.length > 0) {
        paths.push(value);
      }
    }
  }
  return [...new Set(paths)].sort();
}

/**
 * One file's contents at a commit, or `undefined` when the path does not exist
 * there. A path that is added by the candidate simply has no baseline blob, and
 * vice versa for a deletion, so absence is an ordinary outcome rather than a
 * failure.
 *
 * `<commit>:<path>` is passed as a single argument-array element and never
 * through a shell, and `git show` on a blob reads object data without checking
 * anything out.
 */
export async function readFileAtCommit(
  repository: string,
  commit: string,
  path: string,
): Promise<string | undefined> {
  try {
    const { stdout } = await runGit(["show", "--no-textconv", `${commit}:${path}`], {
      cwd: repository,
    });
    return stdout;
  } catch {
    return undefined;
  }
}

/** Every tracked path at a commit, read from the commit's tree rather than a checkout. */
export async function listTrackedPaths(repository: string, commit: string): Promise<string[]> {
  const { stdout } = await runGit(["ls-tree", "-r", "--name-only", "-z", commit], {
    cwd: repository,
  });
  return stdout.split("\0").filter((entry) => entry.length > 0);
}
