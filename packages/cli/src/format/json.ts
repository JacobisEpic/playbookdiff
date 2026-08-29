import type { CompatibilityFinding, CompatibilityReport } from "@playbookdiff/core";
import type { CliContext } from "./context.js";

/**
 * The smallest stable machine contract for `check --json`: the caller's CLI
 * context plus the unmodified `CompatibilityReport` (which already carries
 * findings, per-category summary, and both retained effective configs with
 * their diagnostics/provenance). PlaybookDiff does not introduce a second,
 * CLI-specific report shape.
 */
export type CheckJsonOutput = {
  context: CliContext;
  report: CompatibilityReport;
};

export function toCheckJson(context: CliContext, report: CompatibilityReport): string {
  const output: CheckJsonOutput = { context, report };
  return JSON.stringify(output, null, 2);
}

/**
 * The smallest stable machine contract for `explain --json`: the CLI context
 * plus the exact matched finding, unmodified.
 */
export type ExplainJsonOutput = {
  context: CliContext;
  finding: CompatibilityFinding;
};

export function toExplainJson(context: CliContext, finding: CompatibilityFinding): string {
  const output: ExplainJsonOutput = { context, finding };
  return JSON.stringify(output, null, 2);
}
