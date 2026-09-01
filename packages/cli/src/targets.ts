import { matchesClaudeRulePath } from "@playbookdiff/harness-claude";

/**
 * One modeled analysis context for a revision pair. `path` is the repo-relative
 * POSIX path the coding agent is modeled as working on; `undefined` models a
 * session with no specific work target, which is what compiles a harness's
 * startup-only configuration.
 *
 * A target is deliberately not a launch directory. `cwd` stays exactly as the
 * caller configured it, because which directory a developer starts their agent
 * in is a property of how they work, not something a pull request states. See
 * `deriveAnalysisTargets`.
 */
export type AnalysisTarget = {
  path?: string;
  reason: TargetReason;
};

export type TargetReason =
  | "startup"
  | "configuration-scope"
  | "changed-source"
  | "path-scoped-rule";

export type TargetDerivation = {
  targets: AnalysisTarget[];
  /** Derived targets dropped because the bound below was reached. */
  omitted: number;
};

/**
 * Upper bound on derived contexts, so a very large pull request cannot turn one
 * CI step into an unbounded number of analyses. Contexts are deduplicated by
 * effective scope first, so reaching this bound means a pull request genuinely
 * touched this many distinct configuration scopes.
 */
export const MAX_DERIVED_TARGETS = 48;

const INSTRUCTION_BASENAMES = new Set([
  "CLAUDE.md",
  "CLAUDE.local.md",
  "AGENTS.md",
  "AGENTS.override.md",
]);

const CONFIGURATION_DIRECTORIES = new Set([".claude", ".agents", ".codex"]);

const ROOT = ".";

function posixDirname(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? ROOT : path.slice(0, index);
}

function posixBasename(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? path : path.slice(index + 1);
}

/**
 * The repository directory whose subtree a changed configuration file governs,
 * or `undefined` when the path is not recognized agent configuration.
 *
 * A configuration file does not govern the directory that physically contains
 * it: `apps/api/.claude/rules/go.md` governs `apps/api`, not
 * `apps/api/.claude/rules`. Collapsing the harness-specific container directory
 * is what lets a changed rule, skill, or MCP file resolve to the same scope as
 * a changed instruction file beside it.
 */
export function governingDirectory(path: string): string | undefined {
  const segments = path.split("/");
  const containerIndex = segments.findIndex((segment) => CONFIGURATION_DIRECTORIES.has(segment));
  if (containerIndex !== -1) {
    const prefix = segments.slice(0, containerIndex);
    return prefix.length === 0 ? ROOT : prefix.join("/");
  }
  const basename = posixBasename(path);
  if (INSTRUCTION_BASENAMES.has(basename) || basename === ".mcp.json") {
    return posixDirname(path);
  }
  return undefined;
}

export function isConfigurationPath(path: string): boolean {
  return governingDirectory(path) !== undefined;
}

/**
 * The scope a target shares with every other target that would compile the same
 * effective configuration.
 *
 * Two work targets are interchangeable when they sit in the same directory - so
 * a harness's descent toward them visits the same instruction, rule, and skill
 * directories - and when the same path-scoped patterns match them. Restricting
 * the pattern side to patterns that actually changed is what keeps this bounded:
 * an unchanged path-scoped rule produces the same finding at both revisions and
 * therefore cannot turn into a regression, so it can never be the reason two
 * contexts must be analyzed separately.
 */
function scopeKey(target: AnalysisTarget, changedPatterns: readonly string[]): string {
  const { path } = target;
  if (path === undefined) {
    return "\0startup";
  }
  // A directory context is entered directly, so its scope is that directory; a
  // file context is reached by descending to the directory holding it. Getting
  // this distinction wrong would keep `server` and `server/routes.go` apart even
  // though a harness compiles exactly the same configuration for both.
  const directory = target.reason === "configuration-scope" ? path : posixDirname(path);
  const matched = changedPatterns
    .filter((pattern) => matchesClaudeRulePath([pattern], path))
    .sort();
  return `${directory}\0${matched.join("\0")}`;
}

/**
 * Orders derived contexts deterministically: the startup context first, then by
 * path. Output must not depend on Git's enumeration order or on filesystem
 * iteration, so the same revision pair always produces the same analyses.
 */
function compareTargets(left: AnalysisTarget, right: AnalysisTarget): number {
  if (left.path === undefined) return right.path === undefined ? 0 : -1;
  if (right.path === undefined) return 1;
  return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
}

/**
 * Chooses which analysis contexts represent a revision pair, given the paths
 * that differ between the two commits.
 *
 * The startup context is always included, so root-level configuration is
 * covered exactly as it was before automatic derivation existed. Beyond that:
 *
 * - a changed configuration file contributes its governing directory, because a
 *   harness that reaches nested configuration on demand only does so once it
 *   works on something in that subtree;
 * - a changed source file contributes itself, because configuration nested
 *   above it, or scoped to paths like it, applies there;
 * - a path-scoped pattern from a changed rule or skill contributes a real
 *   tracked file it matches, supplied by the caller, so a rule whose scope
 *   nothing else in the pull request exercises is still represented.
 *
 * Contexts are then deduplicated by effective scope and bounded. Nothing here
 * invents a file: every derived path is either a changed path, a directory that
 * contains changed configuration, or a tracked path the caller located.
 */
export function deriveAnalysisTargets(input: {
  changedPaths: readonly string[];
  /** `paths:` globs read from changed Claude rule and skill frontmatter. */
  changedPathPatterns?: readonly string[];
  /** Tracked repository paths matching `changedPathPatterns`, located by the caller. */
  patternRepresentatives?: readonly string[];
  limit?: number;
}): TargetDerivation {
  const changedPatterns = input.changedPathPatterns ?? [];
  const limit = input.limit ?? MAX_DERIVED_TARGETS;

  const candidates: AnalysisTarget[] = [{ reason: "startup" }];

  // Changed source files come first so that when a source file and the
  // directory containing changed configuration share one scope, the retained
  // representative is the more specific one - a real file also exercises
  // path-scoped rules, while a bare directory only exercises descent.
  for (const path of [...input.changedPaths].sort()) {
    if (!isConfigurationPath(path)) {
      candidates.push({ path, reason: "changed-source" });
    }
  }
  for (const path of [...(input.patternRepresentatives ?? [])].sort()) {
    candidates.push({ path, reason: "path-scoped-rule" });
  }
  const governingDirectories = new Set<string>();
  for (const path of input.changedPaths) {
    const directory = governingDirectory(path);
    // Root-governing configuration is already represented by the startup
    // context, which is exactly the session that receives it.
    if (directory !== undefined && directory !== ROOT) {
      governingDirectories.add(directory);
    }
  }
  for (const directory of [...governingDirectories].sort()) {
    candidates.push({ path: directory, reason: "configuration-scope" });
  }

  const seen = new Set<string>();
  const targets: AnalysisTarget[] = [];
  let omitted = 0;
  for (const candidate of candidates) {
    const key = scopeKey(candidate, changedPatterns);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (targets.length >= limit) {
      omitted += 1;
      continue;
    }
    targets.push(candidate);
  }

  return { targets: targets.sort(compareTargets), omitted };
}

/**
 * Picks one tracked path per pattern to represent a changed path-scoped rule or
 * skill, preferring a path the pull request already changed so the modeled
 * context stays close to what the pull request is about, and otherwise falling
 * back to the first matching tracked path.
 *
 * Returning nothing when a pattern matches no tracked path is deliberate: a
 * scope the repository has no files in is not a scope any session can reach, and
 * manufacturing one would report divergence that no developer can encounter.
 */
export function selectPatternRepresentatives(input: {
  patterns: readonly string[];
  changedPaths: readonly string[];
  trackedPaths: readonly string[];
}): string[] {
  const changed = [...input.changedPaths].sort();
  const tracked = [...input.trackedPaths].sort();
  const representatives = new Set<string>();
  for (const pattern of input.patterns) {
    const fromChanged = changed.find((path) => matchesClaudeRulePath([pattern], path));
    if (fromChanged !== undefined) {
      representatives.add(fromChanged);
      continue;
    }
    const fromTracked = tracked.find((path) => matchesClaudeRulePath([pattern], path));
    if (fromTracked !== undefined) {
      representatives.add(fromTracked);
    }
  }
  return [...representatives].sort();
}
