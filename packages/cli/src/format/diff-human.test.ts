import type { CompatibilityFinding, CompatibilityReportDelta } from "@playbookdiff/core";
import { describe, expect, it } from "vitest";
import type { CompatibilityDiffSummary, RevisionSummary } from "../commands/diff.js";
import type { CliContext } from "./context.js";
import { renderDiffHuman } from "./diff-human.js";

function finding(overrides: Partial<CompatibilityFinding> = {}): CompatibilityFinding {
  return {
    id: "instruction:missing:right:test:abc123456789",
    category: "instruction",
    type: "missing",
    severity: "medium",
    confidence: "deterministic",
    explanation: "Claude Code has an instruction with no Codex equivalent.",
    evidence: [],
    ...overrides,
  };
}

function revision(revisionName: string, commit: string): RevisionSummary {
  return { revision: revisionName, commit, diagnostics: { claude: [], codex: [] } };
}

function summary(overrides: Partial<CompatibilityDiffSummary> = {}): CompatibilityDiffSummary {
  return {
    introduced: 0,
    introducedActionable: 0,
    introducedInformational: 0,
    resolved: 0,
    unchanged: 0,
    ...overrides,
  };
}

const context: CliContext = { repository: ".", cwd: ".", targetPath: "apps/web/src/page.tsx" };
const emptyDelta: CompatibilityReportDelta = { introduced: [], resolved: [], unchanged: [] };

describe("renderDiffHuman", () => {
  it("shows revision labels with short SHAs and full cwd/target context", () => {
    const output = renderDiffHuman(
      context,
      revision("main", "abc1234567890abc1234567890abc1234567890a"),
      revision("HEAD", "def4567890def4567890def4567890def4567890"),
      emptyDelta,
      summary(),
    );
    expect(output).toContain("Baseline: main (abc1234)");
    expect(output).toContain("Candidate: HEAD (def4567)");
    expect(output).toContain("Target: apps/web/src/page.tsx");
    expect(output).toContain("Result: no new actionable compatibility regressions");
  });

  it("makes introduced regressions prominent and never buries them under unchanged debt", () => {
    const introducedFinding = finding({ id: "skill:capability-gap:right:deploy:zzz999999999" });
    const output = renderDiffHuman(
      context,
      revision("main", "a".repeat(40)),
      revision("HEAD", "b".repeat(40)),
      { introduced: [introducedFinding], resolved: [], unchanged: [finding()] },
      summary({ introduced: 1, introducedActionable: 1, unchanged: 1 }),
    );
    const introducedIndex = output.indexOf("Introduced");
    const unchangedMentionIndex = output.indexOf("unchanged from the baseline");
    expect(introducedIndex).toBeGreaterThan(-1);
    expect(unchangedMentionIndex).toBeGreaterThan(introducedIndex);
    expect(output).toContain("Result: 1 new compatibility regression");
  });

  it("does not print unchanged findings in full, only a count", () => {
    const unchangedFinding = finding({ id: "instruction:missing:right:only-in-count:1111111111" });
    const output = renderDiffHuman(
      context,
      revision("main", "a".repeat(40)),
      revision("HEAD", "b".repeat(40)),
      { introduced: [], resolved: [], unchanged: [unchangedFinding] },
      summary({ unchanged: 1 }),
    );
    expect(output).not.toContain(unchangedFinding.id);
    expect(output).toContain("1 unchanged pre-existing finding");
  });

  it("shows resolved findings without treating them as a failure", () => {
    const resolvedFinding = finding({
      id: "instruction:missing:right:resolved-example:2222222222",
    });
    const output = renderDiffHuman(
      context,
      revision("main", "a".repeat(40)),
      revision("HEAD", "b".repeat(40)),
      { introduced: [], resolved: [resolvedFinding], unchanged: [] },
      summary({ resolved: 1 }),
    );
    expect(output).toContain("Resolved");
    expect(output).toContain(resolvedFinding.id);
    expect(output).toContain("Result: no new actionable compatibility regressions");
  });

  it("exits informational-only correctly: introduced but not a regression", () => {
    const infoFinding = finding({
      id: "instruction:unknown:bucket:3333333333",
      type: "unknown",
      severity: "info",
    });
    const output = renderDiffHuman(
      context,
      revision("main", "a".repeat(40)),
      revision("HEAD", "b".repeat(40)),
      { introduced: [infoFinding], resolved: [], unchanged: [] },
      summary({ introduced: 1, introducedInformational: 1 }),
    );
    expect(output).toContain("1 new informational finding");
    expect(output).toContain("Result: no new actionable compatibility regressions");
  });

  it("never leaks a temporary filesystem path into human output", () => {
    const output = renderDiffHuman(
      context,
      revision("main", "a".repeat(40)),
      revision("HEAD", "b".repeat(40)),
      emptyDelta,
      summary(),
    );
    expect(output).not.toMatch(/\/(tmp|var)\//);
  });
});
