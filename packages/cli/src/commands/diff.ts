import type { CompatibilityFinding, Diagnostic } from "@playbookdiff/core";
import { diffCompatibilityReports } from "@playbookdiff/core";
import { analyzeRepository, isAnalysisContextError } from "../analysis.js";
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
} from "../git/revisions.js";
import type { CommandOutcome } from "./outcome.js";

export type DiffOptions = {
  repository: string;
  range: string;
  cwd: string;
  targetPath?: string;
  json: boolean;
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

async function analyzeAtRevision(
  repository: string,
  revision: string,
  label: "baseline" | "candidate",
  cwd: string,
  targetPath: string | undefined,
) {
  return withMaterializedRevision(repository, revision, label, async (directory, commit) => {
    try {
      const result = await analyzeRepository({
        repository: directory,
        cwd,
        ...(targetPath !== undefined ? { targetPath } : {}),
      });
      return { result, revision, commit };
    } catch (error) {
      if (isAnalysisContextError(error)) {
        throw new DiffRevisionAnalysisError(label, revision);
      }
      throw error;
    }
  });
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

    const baselineOutcome = await analyzeAtRevision(
      options.repository,
      baselineRevision,
      "baseline",
      options.cwd,
      options.targetPath,
    );
    const candidateOutcome = await analyzeAtRevision(
      options.repository,
      candidateRevision,
      "candidate",
      options.cwd,
      options.targetPath,
    );

    const delta = diffCompatibilityReports(
      baselineOutcome.result.report,
      candidateOutcome.result.report,
    );
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
      ? toDiffJson(context, baseline, candidate, delta, summary)
      : renderDiffHuman(context, baseline, candidate, delta, summary);
    return { exitCode, stdout };
  } catch (error) {
    if (isDiffInputError(error)) {
      return { exitCode: EXIT_ANALYSIS_ERROR, stderr: `Error: ${error.message}` };
    }
    throw error;
  }
}
