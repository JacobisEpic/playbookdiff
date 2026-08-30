/**
 * The canonical coordinate system for normalized instruction applicability.
 *
 * Every `EffectiveInstruction.scope.appliesTo` / `scope.excludedFrom` entry is
 * a **repository-root-relative POSIX path or glob**, never a cwd-relative one
 * and never an absolute one. The repository root itself is `"."`.
 *
 * Adapters discover configuration through harness-specific mechanics (Claude
 * Code walks the cwd ancestor chain and lazily descends toward a target path;
 * Codex walks the cwd ancestor chain only), but the applicability they *report*
 * must be expressed against the repository root so that two instructions
 * governing the same effective location compare equal regardless of which
 * adapter found them, and regardless of where the agent was launched from.
 *
 * The comparator normalizes defensively through {@link canonicalizeScopePath}
 * before building a scope signature, so an adapter that reports
 * `"./server/"`, `"server"`, or `"server/."` cannot manufacture a false
 * `scope-gap` out of pure representation.
 */

/**
 * Normalizes one applicability entry to its canonical repository-relative
 * POSIX form.
 *
 * This is deliberately a *representational* normalization only: it rewrites
 * separators and removes redundant `.` and empty segments. It never resolves
 * `..`, never expands globs, and never reinterprets one location as another,
 * so `**` and other glob syntax used by Claude Code path-scoped rules survives
 * untouched.
 */
export function canonicalizeScopePath(value: string): string {
  const separatorNormalized = value.replace(/\\/g, "/");
  const segments = separatorNormalized.split("/").filter((segment) => {
    return segment.length > 0 && segment !== ".";
  });
  if (segments.length === 0) {
    return ".";
  }
  return segments.join("/");
}

/** Canonicalizes, de-duplicates, and sorts a set of applicability entries. */
export function canonicalizeScopePaths(values: readonly string[] | undefined): string[] {
  const canonical = new Set((values ?? []).map(canonicalizeScopePath));
  return [...canonical].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}
