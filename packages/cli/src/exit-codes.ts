import type { CompatibilityFinding, CompatibilityReport } from "@playbookdiff/core";

/** Analysis completed and found no actionable compatibility divergence. */
export const EXIT_SUCCESS = 0;

/** Analysis completed and found one or more actionable compatibility findings. */
export const EXIT_ACTIONABLE_FINDINGS = 1;

/** PlaybookDiff could not perform the requested analysis (invalid input, lookup failure, or CLI error). */
export const EXIT_ANALYSIS_ERROR = 2;

/**
 * Medium/high severity findings are actionable structural compatibility gaps.
 * Low severity is an informational structural difference and info severity is
 * uncertainty; neither should fail `check`.
 */
export function isActionableFinding(finding: CompatibilityFinding): boolean {
  return finding.severity === "medium" || finding.severity === "high";
}

export function actionableFindings(report: CompatibilityReport): readonly CompatibilityFinding[] {
  return report.findings.filter(isActionableFinding);
}

export function determineCheckExitCode(report: CompatibilityReport): number {
  return actionableFindings(report).length > 0 ? EXIT_ACTIONABLE_FINDINGS : EXIT_SUCCESS;
}
