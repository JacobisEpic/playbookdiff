import { sortFindings } from "../compare/sort.js";
import type { CompatibilityFinding, CompatibilityReport } from "../types/index.js";

/**
 * A report contained two findings with the same stable ID. Stable IDs are
 * supposed to be unique per report; a duplicate means the ID-based delta
 * below cannot trust either finding, so this fails loudly instead of
 * silently overwriting one with the other in an index.
 */
export class DuplicateFindingIdError extends Error {
  constructor(id: string, report: "baseline" | "candidate") {
    super(`${report} report contains duplicate finding ID "${id}"`);
    this.name = "DuplicateFindingIdError";
  }
}

export type CompatibilityReportDelta = {
  introduced: CompatibilityFinding[];
  resolved: CompatibilityFinding[];
  unchanged: CompatibilityFinding[];
};

function indexById(
  findings: readonly CompatibilityFinding[],
  report: "baseline" | "candidate",
): Map<string, CompatibilityFinding> {
  const index = new Map<string, CompatibilityFinding>();
  for (const finding of findings) {
    if (index.has(finding.id)) {
      throw new DuplicateFindingIdError(finding.id, report);
    }
    index.set(finding.id, finding);
  }
  return index;
}

/**
 * Compares two CompatibilityReports by stable finding ID to determine which
 * findings a candidate introduced, resolved, or left unchanged relative to a
 * baseline. Matching is by ID alone - never by source line numbers, prose, or
 * host paths - so a finding that merely shifted lines or was re-analyzed at a
 * different filesystem root is still recognized as the same finding.
 *
 * Because severity is a pure function of a finding's category and type (both
 * embedded in its stable ID), the same ID can never carry a different
 * severity across two reports produced by `compareEffectiveConfigs`; there is
 * no third "changed" bucket to model.
 *
 * Pure: performs no I/O, does not mutate its inputs, and does not know about
 * Git, the filesystem, or the CLI's actionability policy.
 */
export function diffCompatibilityReports(
  baseline: CompatibilityReport,
  candidate: CompatibilityReport,
): CompatibilityReportDelta {
  const baselineIndex = indexById(baseline.findings, "baseline");
  const candidateIndex = indexById(candidate.findings, "candidate");

  const introduced: CompatibilityFinding[] = [];
  const unchanged: CompatibilityFinding[] = [];
  for (const [id, finding] of candidateIndex) {
    if (baselineIndex.has(id)) {
      unchanged.push(finding);
    } else {
      introduced.push(finding);
    }
  }

  const resolved: CompatibilityFinding[] = [];
  for (const [id, finding] of baselineIndex) {
    if (!candidateIndex.has(id)) {
      resolved.push(finding);
    }
  }

  return {
    introduced: sortFindings(introduced),
    resolved: sortFindings(resolved),
    unchanged: sortFindings(unchanged),
  };
}
