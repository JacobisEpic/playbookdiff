import type { CompatibilityFinding, Diagnostic } from "@playbookdiff/core";
import { diffFindings } from "@playbookdiff/core";
import { analyzeRepository, isAnalysisContextError, type AnalysisResult } from "../analysis.js";
import { deriveTargetsForRevisionPair } from "../derive-targets.js";
import type { AnalysisTarget } from "../targets.js";
import { EXIT_ANALYSIS_ERROR, determineDiffExitCode, isActionableFinding } from "../exit-codes.js";
import { buildCliContext } from "../format/context.js";
import { renderDiffHuman } from "../format/diff-human.js";
import { toDiffJson } from "../format/diff-json.js";
import { GitCommandError } from "../git/exec.js";
import { withMaterializedRevision } from "../git/materialize.js";
import { GitRepositoryError, assertGitWorkTree } from "../git/repository.js";
import {
  InvalidRevisionRangeError,
  RevisionResolutionError,
  parseRevisionRange,
  resolveRevision,
} from "../git/revisions.js";
import type { CommandOutcome } from "./outcome.js";

export type DiffOptions = {
  repository: string;
  range: string;
  cwd: string;
  targetPath?: string;
  json: boolean;
  /**
   * When true and no `targetPath` is given, analysis contexts are derived from
   * the paths that differ between the two revisions instead of analyzing the
   * startup context alone. An explicit `targetPath` always wins: a caller who
   * named a work target gets exactly that one, so explicit intent stays
   * predictable.
   */
  deriveTargets?: boolean;
};

/** What was actually analyzed, so output can state it rather than implying full coverage. */
export type AnalyzedTargets = {
  targets: AnalysisTarget[];
  changedPathCount: number;
  omitted: number;
  derived: boolean;
};

export type RevisionSummary = {
  revision: string;
  commit: string;
  diagnostics: { claude: Diagnostic[]; codex: Diagnostic[] };
};

export type CompatibilityDiffSummary = {
  introduced: number;
  introducedActionable: number;
  introducedInformational: number;
  resolved: number;
  unchanged: number;
};

/**
 * The requested `--cwd`/`--path` could not be analyzed at one of the two
 * revisions (for example, `--cwd` names a directory that was added after the
 * baseline commit). This is deliberately generic rather than forwarding the
 * underlying `AnalysisContextError` message, which names an absolute path
 * inside a disposable temporary worktree that must never appear in output.
 */
export class DiffRevisionAnalysisError extends Error {
  constructor(label: "baseline" | "candidate", revision: string) {
    super(
      `could not analyze ${label} revision "${revision}": the requested --cwd or --path does not exist at that revision`,
    );
    this.name = "DiffRevisionAnalysisError";
  }
}

function isDiffInputError(error: unknown): error is Error {
  return (
    error instanceof GitRepositoryError ||
    error instanceof InvalidRevisionRangeError ||
    error instanceof RevisionResolutionError ||
    error instanceof DiffRevisionAnalysisError ||
    error instanceof GitCommandError ||
    isAnalysisContextError(error)
  );
}

export function buildDiffSummary(
  introduced: readonly CompatibilityFinding[],
  resolved: readonly CompatibilityFinding[],
  unchanged: readonly CompatibilityFinding[],
): CompatibilityDiffSummary {
  const introducedActionable = introduced.filter(isActionableFinding).length;
  return {
    introduced: introduced.length,
    introducedActionable,
    introducedInformational: introduced.length - introducedActionable,
    resolved: resolved.length,
    unchanged: unchanged.length,
  };
}

/**
 * Analyzes one revision once per modeled target, inside a single disposable
 * worktree, and merges the results into one deduplicated finding set for that
 * revision.
 *
 * Merging by stable finding ID, rather than keeping per-target deltas, is what
 * makes multi-target regression semantics correct: a finding that any baseline
 * context already produced is part of the repository's existing state, so it can
 * never be reported as introduced just because some other context also reaches
 * it. The retained instance is the first in target order, which is
 * deterministic.
 */
async function analyzeAtRevision(
  repository: string,
  revision: string,
  label: "baseline" | "candidate",
  cwd: string,
  targets: readonly AnalysisTarget[],
) {
  return withMaterializedRevision(repository, revision, label, async (directory, commit) => {
    const findings = new Map<string, CompatibilityFinding>();
    let primary: AnalysisResult | undefined;
    for (const target of targets) {
      let result: AnalysisResult;
      try {
        result = await analyzeRepository({
          repository: directory,
          cwd,
          ...(target.path !== undefined ? { targetPath: target.path } : {}),
        });
      } catch (error) {
        if (isAnalysisContextError(error)) {
          // A derived target can name a path this revision does not contain;
          // that is the ordinary shape of an addition or a deletion, and the
          // adapters already model a work target that does not exist yet. Only
          // the caller's own explicitly requested context is a hard error.
          if (target.reason !== "startup" && targets.length > 1) {
            continue;
          }
          throw new DiffRevisionAnalysisError(label, revision);
        }
        throw error;
      }
      primary ??= result;
      for (const finding of result.report.findings) {
        if (!findings.has(finding.id)) {
          findings.set(finding.id, finding);
        }
      }
    }
    if (primary === undefined) {
      throw new DiffRevisionAnalysisError(label, revision);
    }
    return { result: primary, findings: [...findings.values()], revision, commit };
  });
}

/**
 * Decides which contexts this run analyzes.
 *
 * An explicit `targetPath` is honored exactly as given and never combined with
 * derived contexts, so a caller who named a work target gets that one analysis
 * and nothing else. Automatic derivation applies only when it was requested and
 * no target was named; if derivation cannot read the revision pair's changed
 * paths, analysis falls back to the startup context rather than failing, since
 * that is the behavior callers had before derivation existed.
 */
async function resolveAnalyzedTargets(
  options: DiffOptions,
  baselineRevision: string,
  candidateRevision: string,
): Promise<AnalyzedTargets> {
  if (options.targetPath !== undefined || options.deriveTargets !== true) {
    return {
      targets: [
        {
          reason: "startup",
          ...(options.targetPath !== undefined ? { path: options.targetPath } : {}),
        },
      ],
      changedPathCount: 0,
      omitted: 0,
      derived: false,
    };
  }
  const baselineCommit = await resolveRevision(options.repository, baselineRevision, "baseline");
  const candidateCommit = await resolveRevision(options.repository, candidateRevision, "candidate");
  const derived = await deriveTargetsForRevisionPair({
    repository: options.repository,
    baselineCommit,
    candidateCommit,
  });
  return { ...derived, derived: true };
}

/**
 * Compares PlaybookDiff analysis at two Git revisions of the same repository
 * and reports only the compatibility findings the candidate introduced or
 * resolved relative to the baseline - pre-existing divergence common to both
 * revisions never affects the exit code. Both revisions are analyzed from
 * disposable detached worktrees; the caller's active checkout, branch, HEAD,
 * and index are never touched, and no remote is ever fetched.
 */
export async function runDiff(options: DiffOptions): Promise<CommandOutcome> {
  try {
    await assertGitWorkTree(options.repository);
    const { baseline: baselineRevision, candidate: candidateRevision } = parseRevisionRange(
      options.range,
    );

    const analyzed = await resolveAnalyzedTargets(options, baselineRevision, candidateRevision);

    const baselineOutcome = await analyzeAtRevision(
      options.repository,
      baselineRevision,
      "baseline",
      options.cwd,
      analyzed.targets,
    );
    const candidateOutcome = await analyzeAtRevision(
      options.repository,
      candidateRevision,
      "candidate",
      options.cwd,
      analyzed.targets,
    );

    const delta = diffFindings(baselineOutcome.findings, candidateOutcome.findings);
    const summary = buildDiffSummary(delta.introduced, delta.resolved, delta.unchanged);
    const exitCode = determineDiffExitCode(delta.introduced);

    const context = buildCliContext(options.repository, candidateOutcome.result.claude);
    const baseline: RevisionSummary = {
      revision: baselineOutcome.revision,
      commit: baselineOutcome.commit,
      diagnostics: {
        claude: baselineOutcome.result.claude.diagnostics,
        codex: baselineOutcome.result.codex.diagnostics,
      },
    };
    const candidate: RevisionSummary = {
      revision: candidateOutcome.revision,
      commit: candidateOutcome.commit,
      diagnostics: {
        claude: candidateOutcome.result.claude.diagnostics,
        codex: candidateOutcome.result.codex.diagnostics,
      },
    };

    const stdout = options.json
      ? toDiffJson(context, baseline, candidate, delta, summary, analyzed)
      : renderDiffHuman(context, baseline, candidate, delta, summary, analyzed);
    return { exitCode, stdout };
  } catch (error) {
    if (isDiffInputError(error)) {
      return { exitCode: EXIT_ANALYSIS_ERROR, stderr: `Error: ${error.message}` };
    }
    throw error;
  }
}
