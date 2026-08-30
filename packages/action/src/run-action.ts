import { EXIT_ACTIONABLE_FINDINGS, EXIT_ANALYSIS_ERROR, runDiff } from "playbookdiff";
import type { DiffJsonOutput } from "playbookdiff";

export type ActionOutcome =
  | { status: "success"; json: DiffJsonOutput }
  | { status: "regressions"; json: DiffJsonOutput }
  | { status: "error"; message: string };

export type RunActionOptions = {
  repository: string;
  baseline: string;
  candidate: string;
  cwd: string;
  targetPath?: string;
};

/**
 * Thin wrapper over the existing `playbookdiff diff` engine: this contains
 * no comparison, regression, or actionability logic of its own. It runs the
 * exact same `runDiff` orchestration the CLI uses, parses its `--json`
 * contract, and classifies the result for GitHub-specific presentation.
 */
export async function runAction(options: RunActionOptions): Promise<ActionOutcome> {
  const outcome = await runDiff({
    repository: options.repository,
    range: `${options.baseline}..${options.candidate}`,
    cwd: options.cwd,
    ...(options.targetPath !== undefined ? { targetPath: options.targetPath } : {}),
    json: true,
  });

  if (outcome.exitCode === EXIT_ANALYSIS_ERROR) {
    return {
      status: "error",
      message: outcome.stderr ?? "PlaybookDiff could not complete the analysis.",
    };
  }

  const json = JSON.parse(outcome.stdout ?? "{}") as DiffJsonOutput;
  return {
    status: outcome.exitCode === EXIT_ACTIONABLE_FINDINGS ? "regressions" : "success",
    json,
  };
}

const FETCH_DEPTH_HINT =
  'Ensure your checkout includes the required Git history (for actions/checkout, use "fetch-depth: 0").';

/**
 * Analysis errors caused by a revision that could not be resolved locally
 * are, in CI, almost always a shallow-checkout problem rather than a typo -
 * this appends the fix without changing the underlying CLI error message
 * contract that `packages/cli` already tests.
 */
export function enrichAnalysisErrorMessage(message: string): string {
  return /could not resolve (baseline|candidate) revision/.test(message)
    ? `${message}\n${FETCH_DEPTH_HINT}`
    : message;
}
