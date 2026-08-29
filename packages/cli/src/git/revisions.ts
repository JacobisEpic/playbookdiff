import { GitCommandError, runGit } from "./exec.js";

/** The `<baseline>..<candidate>` argument was not a well-formed two-revision range. */
export class InvalidRevisionRangeError extends Error {
  constructor(range: string) {
    super(
      `invalid revision range "${range}"; expected exactly "BASELINE..CANDIDATE" (two revisions separated by "..")`,
    );
    this.name = "InvalidRevisionRangeError";
  }
}

/** A baseline or candidate revision string could not be resolved to a commit in the local repository. */
export class RevisionResolutionError extends Error {
  constructor(label: "baseline" | "candidate", revision: string) {
    super(`could not resolve ${label} revision "${revision}"`);
    this.name = "RevisionResolutionError";
  }
}

export type RevisionRange = {
  baseline: string;
  candidate: string;
};

/**
 * Parses the explicit two-dot `BASELINE..CANDIDATE` form only. Deliberately
 * does not support triple-dot (merge-base) syntax or any other Git range
 * shorthand: the range argument must name exactly the two revisions to
 * analyze, with no hidden Git magic substituting a merge-base.
 */
export function parseRevisionRange(range: string): RevisionRange {
  if (range.includes("...")) {
    throw new InvalidRevisionRangeError(range);
  }
  const separatorIndex = range.indexOf("..");
  if (separatorIndex === -1) {
    throw new InvalidRevisionRangeError(range);
  }
  const baseline = range.slice(0, separatorIndex);
  const candidate = range.slice(separatorIndex + 2);
  if (baseline.length === 0 || candidate.length === 0 || candidate.includes("..")) {
    throw new InvalidRevisionRangeError(range);
  }
  return { baseline, candidate };
}

/**
 * Resolves `revision` to a full commit SHA using only local refs - never
 * fetching, never guessing at ambiguous input. `revision` is passed as a
 * single argv entry to `git`, so it cannot be interpreted as shell syntax
 * regardless of what characters it contains.
 */
export async function resolveRevision(
  repository: string,
  revision: string,
  label: "baseline" | "candidate",
): Promise<string> {
  try {
    const { stdout } = await runGit(["rev-parse", "--verify", `${revision}^{commit}`], {
      cwd: repository,
    });
    return stdout.trim();
  } catch (error) {
    if (error instanceof GitCommandError) {
      throw new RevisionResolutionError(label, revision);
    }
    throw error;
  }
}
