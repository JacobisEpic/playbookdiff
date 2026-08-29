import type { CompatibilityReportDelta } from "@playbookdiff/core";
import type { CompatibilityDiffSummary, RevisionSummary } from "../commands/diff.js";
import type { CliContext } from "./context.js";

/**
 * The stable machine contract for `diff --json`. Deliberately omits the full
 * baseline/candidate `CompatibilityReport`s (which would duplicate every
 * pre-existing finding on both sides just to describe a delta) in favor of
 * the delta itself plus enough revision context to interpret it - each
 * finding is still the unmodified `CompatibilityFinding` from
 * `@playbookdiff/core`, not a second shape.
 */
export type DiffJsonOutput = {
  context: CliContext;
  baseline: RevisionSummary;
  candidate: RevisionSummary;
  diff: {
    introduced: CompatibilityReportDelta["introduced"];
    resolved: CompatibilityReportDelta["resolved"];
    unchanged: CompatibilityReportDelta["unchanged"];
    summary: CompatibilityDiffSummary;
  };
};

export function toDiffJson(
  context: CliContext,
  baseline: RevisionSummary,
  candidate: RevisionSummary,
  delta: CompatibilityReportDelta,
  summary: CompatibilityDiffSummary,
): string {
  const output: DiffJsonOutput = {
    context,
    baseline,
    candidate,
    diff: {
      introduced: delta.introduced,
      resolved: delta.resolved,
      unchanged: delta.unchanged,
      summary,
    },
  };
  return JSON.stringify(output, null, 2);
}
