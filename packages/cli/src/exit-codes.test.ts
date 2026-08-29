import type { CompatibilityFinding, CompatibilityReport } from "@playbookdiff/core";
import { describe, expect, it } from "vitest";
import {
  EXIT_ACTIONABLE_FINDINGS,
  EXIT_SUCCESS,
  actionableFindings,
  determineCheckExitCode,
  isActionableFinding,
} from "./exit-codes.js";

function finding(overrides: Partial<CompatibilityFinding>): CompatibilityFinding {
  return {
    id: "test-id",
    category: "instruction",
    type: "unknown",
    severity: "info",
    confidence: "deterministic",
    explanation: "test",
    evidence: [],
    ...overrides,
  };
}

function reportWith(findings: CompatibilityFinding[]): CompatibilityReport {
  return {
    left: {} as CompatibilityReport["left"],
    right: {} as CompatibilityReport["right"],
    findings,
    summary: {
      counts: { high: 0, medium: 0, low: 0, info: 0 },
      byCategory: {},
    },
  };
}

describe("isActionableFinding", () => {
  it("treats medium and high severity as actionable", () => {
    expect(isActionableFinding(finding({ severity: "medium" }))).toBe(true);
    expect(isActionableFinding(finding({ severity: "high" }))).toBe(true);
  });

  it("treats low and info severity as non-actionable", () => {
    expect(isActionableFinding(finding({ severity: "low" }))).toBe(false);
    expect(isActionableFinding(finding({ severity: "info" }))).toBe(false);
  });
});

describe("determineCheckExitCode", () => {
  it("returns success when there are no actionable findings, even with an unknown", () => {
    const report = reportWith([finding({ severity: "info", type: "unknown" })]);
    expect(determineCheckExitCode(report)).toBe(EXIT_SUCCESS);
  });

  it("returns success for zero findings", () => {
    expect(determineCheckExitCode(reportWith([]))).toBe(EXIT_SUCCESS);
  });

  it("returns actionable-findings exit code when a medium finding exists", () => {
    const report = reportWith([finding({ severity: "medium", type: "missing" })]);
    expect(determineCheckExitCode(report)).toBe(EXIT_ACTIONABLE_FINDINGS);
  });

  it("does not fail on low severity alone", () => {
    const report = reportWith([finding({ severity: "low", type: "different" })]);
    expect(determineCheckExitCode(report)).toBe(EXIT_SUCCESS);
  });
});

describe("actionableFindings", () => {
  it("filters to only medium/high findings", () => {
    const medium = finding({ severity: "medium", id: "a" });
    const info = finding({ severity: "info", id: "b" });
    const low = finding({ severity: "low", id: "c" });
    const result = actionableFindings(reportWith([medium, info, low]));
    expect(result).toEqual([medium]);
  });
});
