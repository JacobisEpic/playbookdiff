import type { ActionOutcome } from "./run-action.js";

/**
 * "no-new-regressions"/"new-regressions" rather than "compatible"/"pass":
 * PlaybookDiff never claims Claude Code and Codex behave identically, only
 * that no new deterministic configuration regression was introduced.
 */
export function buildOutputs(
  outcome: Extract<ActionOutcome, { status: "success" | "regressions" }>,
): Record<string, string> {
  const { json } = outcome;
  const { summary } = json.diff;
  return {
    result: outcome.status === "regressions" ? "new-regressions" : "no-new-regressions",
    "introduced-count": String(summary.introduced),
    "introduced-actionable-count": String(summary.introducedActionable),
    "introduced-informational-count": String(summary.introducedInformational),
    "resolved-count": String(summary.resolved),
    "unchanged-count": String(summary.unchanged),
    "baseline-sha": json.baseline.commit,
    "candidate-sha": json.candidate.commit,
  };
}
