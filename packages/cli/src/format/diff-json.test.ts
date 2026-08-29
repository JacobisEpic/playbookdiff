import type { CompatibilityFinding, CompatibilityReportDelta } from "@playbookdiff/core";
import { describe, expect, it } from "vitest";
import type { CompatibilityDiffSummary, RevisionSummary } from "../commands/diff.js";
import type { CliContext } from "./context.js";
import { toDiffJson } from "./diff-json.js";

const context: CliContext = { repository: ".", cwd: "." };
const baseline: RevisionSummary = {
  revision: "main",
  commit: "a".repeat(40),
  diagnostics: { claude: [], codex: [] },
};
const candidate: RevisionSummary = {
  revision: "HEAD",
  commit: "b".repeat(40),
  diagnostics: { claude: [], codex: [] },
};
const summary: CompatibilityDiffSummary = {
  introduced: 1,
  introducedActionable: 1,
  introducedInformational: 0,
  resolved: 0,
  unchanged: 0,
};

function finding(id: string): CompatibilityFinding {
  return {
    id,
    category: "instruction",
    type: "missing",
    severity: "medium",
    confidence: "deterministic",
    explanation: "test",
    evidence: [],
  };
}

describe("toDiffJson", () => {
  it("produces valid, deterministic JSON with full commit SHAs and the exact delta", () => {
    const delta: CompatibilityReportDelta = {
      introduced: [finding("introduced-1")],
      resolved: [],
      unchanged: [],
    };
    const first = toDiffJson(context, baseline, candidate, delta, summary);
    const second = toDiffJson(context, baseline, candidate, delta, summary);
    expect(first).toBe(second);

    const parsed = JSON.parse(first);
    expect(parsed.context).toEqual(context);
    expect(parsed.baseline).toEqual(baseline);
    expect(parsed.candidate).toEqual(candidate);
    expect(parsed.candidate.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(parsed.diff.introduced).toHaveLength(1);
    expect(parsed.diff.introduced[0].id).toBe("introduced-1");
    expect(parsed.diff.summary).toEqual(summary);
  });

  it("contains no escape control character (never mixes ANSI styling into JSON output)", () => {
    const delta: CompatibilityReportDelta = { introduced: [], resolved: [], unchanged: [] };
    const output = toDiffJson(context, baseline, candidate, delta, summary);
    const escapeCharacter = String.fromCharCode(27);
    expect(output.indexOf(escapeCharacter)).toBe(-1);
  });

  it("never embeds a full baseline/candidate CompatibilityReport, only the delta", () => {
    const delta: CompatibilityReportDelta = { introduced: [], resolved: [], unchanged: [] };
    const parsed = JSON.parse(toDiffJson(context, baseline, candidate, delta, summary));
    expect(parsed.baseline.findings).toBeUndefined();
    expect(parsed.candidate.findings).toBeUndefined();
    expect(parsed.baseline.summary).toBeUndefined();
  });
});
