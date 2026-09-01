import { readClaudePathPatterns } from "@playbookdiff/harness-claude";
import { listChangedPaths, listTrackedPaths, readFileAtCommit } from "./git/changed-paths.js";
import {
  deriveAnalysisTargets,
  isConfigurationPath,
  selectPatternRepresentatives,
  type AnalysisTarget,
  type TargetDerivation,
} from "./targets.js";

/**
 * Claude configuration files whose frontmatter can carry `paths:` globs. Only
 * these are read for patterns, which keeps the number of extra Git reads
 * proportional to how much configuration a pull request touched rather than to
 * repository size.
 */
function carriesPathPatterns(path: string): boolean {
  return (
    /(^|\/)\.claude\/rules\/.+\.md$/.test(path) ||
    /(^|\/)\.claude\/skills\/[^/]+\/SKILL\.md$/.test(path)
  );
}

async function collectChangedPathPatterns(
  repository: string,
  commits: readonly string[],
  changedPaths: readonly string[],
): Promise<string[]> {
  const patterns = new Set<string>();
  for (const path of changedPaths.filter(carriesPathPatterns)) {
    for (const commit of commits) {
      const content = await readFileAtCommit(repository, commit, path);
      if (content === undefined) {
        continue;
      }
      for (const pattern of readClaudePathPatterns(content)) {
        patterns.add(pattern);
      }
    }
  }
  return [...patterns].sort();
}

export type DerivedTargets = TargetDerivation & {
  /** Paths that differ between the two commits, before any scope collapsing. */
  changedPathCount: number;
};

/**
 * Works out which analysis contexts represent a revision pair, reading only
 * local Git object data for the two commits the caller already resolved.
 *
 * Both revisions contribute: a rule's patterns are read at each commit so a
 * pattern that only exists on one side still shapes the derivation, and the
 * resulting target list is applied identically to both revisions. That symmetry
 * is what keeps introduced and resolved meaningful - the two sides are never
 * compared through different sets of contexts.
 *
 * No fetch, no checkout, no repository code, and no GitHub API.
 */
export async function deriveTargetsForRevisionPair(options: {
  repository: string;
  baselineCommit: string;
  candidateCommit: string;
  limit?: number;
}): Promise<DerivedTargets> {
  const { repository, baselineCommit, candidateCommit } = options;
  const changedPaths = await listChangedPaths(repository, baselineCommit, candidateCommit);

  const changedPathPatterns = await collectChangedPathPatterns(
    repository,
    [baselineCommit, candidateCommit],
    changedPaths,
  );

  let patternRepresentatives: string[] = [];
  if (changedPathPatterns.length > 0) {
    // Only a changed path-scoped rule justifies listing the tree, and the
    // candidate's tree is what a reviewer is deciding about.
    const trackedPaths = await listTrackedPaths(repository, candidateCommit);
    patternRepresentatives = selectPatternRepresentatives({
      patterns: changedPathPatterns,
      changedPaths: changedPaths.filter((path) => !isConfigurationPath(path)),
      trackedPaths,
    });
  }

  const derivation = deriveAnalysisTargets({
    changedPaths,
    changedPathPatterns,
    patternRepresentatives,
    ...(options.limit !== undefined ? { limit: options.limit } : {}),
  });

  return { ...derivation, changedPathCount: changedPaths.length };
}

export type { AnalysisTarget };
