import type { CompatibilityFinding, FindingCategory, FindingSeverity } from "../types/index.js";

const CATEGORY_RANK: Record<FindingCategory, number> = {
  instruction: 0,
  skill: 1,
  mcp: 2,
  other: 3,
};

const SEVERITY_RANK: Record<FindingSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};

export function sortFindings(findings: readonly CompatibilityFinding[]): CompatibilityFinding[] {
  return [...findings].sort(
    (left, right) =>
      CATEGORY_RANK[left.category] - CATEGORY_RANK[right.category] ||
      SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity] ||
      left.id.localeCompare(right.id),
  );
}
