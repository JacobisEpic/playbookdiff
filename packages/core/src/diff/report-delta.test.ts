import { describe, expect, it } from "vitest";
import type { CompatibilityFinding, CompatibilityReport, FindingSeverity } from "../types/index.js";
import { DuplicateFindingIdError, diffCompatibilityReports } from "./report-delta.js";

function finding(id: string, severity: FindingSeverity = "medium"): CompatibilityFinding {
  return {
    id,
    category: "instruction",
    type: severity === "info" ? "unknown" : "missing",
    severity,
    confidence: "deterministic",
    explanation: `finding ${id}`,
    evidence: [],
  };
}

function report(findings: readonly CompatibilityFinding[]): CompatibilityReport {
  return {
    left: {} as CompatibilityReport["left"],
    right: {} as CompatibilityReport["right"],
    findings: [...findings],
    summary: { counts: { high: 0, medium: 0, low: 0, info: 0 }, byCategory: {} },
  };
}

describe("diffCompatibilityReports", () => {
  it("treats identical reports as fully unchanged", () => {
    const a = finding("a");
    const b = finding("b");
    const delta = diffCompatibilityReports(report([a, b]), report([b, a]));
    expect(delta.introduced).toEqual([]);
    expect(delta.resolved).toEqual([]);
    expect(delta.unchanged.map((f) => f.id)).toEqual(["a", "b"]);
  });

  it("classifies a candidate-only actionable finding as introduced", () => {
    const delta = diffCompatibilityReports(report([]), report([finding("new", "medium")]));
    expect(delta.introduced.map((f) => f.id)).toEqual(["new"]);
    expect(delta.resolved).toEqual([]);
    expect(delta.unchanged).toEqual([]);
  });

  it("classifies a candidate-only info finding as introduced without special-casing severity", () => {
    const delta = diffCompatibilityReports(report([]), report([finding("new-info", "info")]));
    expect(delta.introduced.map((f) => f.id)).toEqual(["new-info"]);
  });

  it("classifies a candidate-only low finding as introduced", () => {
    const delta = diffCompatibilityReports(report([]), report([finding("new-low", "low")]));
    expect(delta.introduced.map((f) => f.id)).toEqual(["new-low"]);
  });

  it("classifies a baseline-only finding as resolved", () => {
    const delta = diffCompatibilityReports(report([finding("gone")]), report([]));
    expect(delta.resolved.map((f) => f.id)).toEqual(["gone"]);
    expect(delta.introduced).toEqual([]);
    expect(delta.unchanged).toEqual([]);
  });

  it("handles multiple introduced and resolved findings together", () => {
    const kept = finding("kept");
    const delta = diffCompatibilityReports(
      report([finding("gone-1"), finding("gone-2"), kept]),
      report([kept, finding("new-1"), finding("new-2")]),
    );
    expect(delta.introduced.map((f) => f.id).sort()).toEqual(["new-1", "new-2"]);
    expect(delta.resolved.map((f) => f.id).sort()).toEqual(["gone-1", "gone-2"]);
    expect(delta.unchanged.map((f) => f.id)).toEqual(["kept"]);
  });

  it("produces the same output regardless of input finding order", () => {
    const findings = [finding("c"), finding("a"), finding("b")];
    const forward = diffCompatibilityReports(report(findings), report(findings));
    const shuffled = diffCompatibilityReports(
      report([...findings].reverse()),
      report([findings[1]!, findings[2]!, findings[0]!]),
    );
    expect(forward.unchanged.map((f) => f.id)).toEqual(shuffled.unchanged.map((f) => f.id));
  });

  it("returns unchanged findings in the same stable order sortFindings would produce", () => {
    const high = { ...finding("high-severity"), severity: "high" as const };
    const low = { ...finding("low-severity"), severity: "low" as const };
    const delta = diffCompatibilityReports(report([low, high]), report([high, low]));
    expect(delta.unchanged.map((f) => f.severity)).toEqual(["high", "low"]);
  });

  it("does not mutate the baseline or candidate report inputs", () => {
    const baseline = report([finding("a"), finding("gone")]);
    const candidate = report([finding("a"), finding("new")]);
    const baselineSnapshot = JSON.parse(JSON.stringify(baseline));
    const candidateSnapshot = JSON.parse(JSON.stringify(candidate));

    diffCompatibilityReports(baseline, candidate);

    expect(baseline).toEqual(baselineSnapshot);
    expect(candidate).toEqual(candidateSnapshot);
  });

  it("throws DuplicateFindingIdError when the baseline report has a duplicate ID", () => {
    expect(() =>
      diffCompatibilityReports(report([finding("dup"), finding("dup")]), report([])),
    ).toThrow(DuplicateFindingIdError);
  });

  it("throws DuplicateFindingIdError when the candidate report has a duplicate ID", () => {
    expect(() =>
      diffCompatibilityReports(report([]), report([finding("dup"), finding("dup")])),
    ).toThrow(DuplicateFindingIdError);
  });
});
