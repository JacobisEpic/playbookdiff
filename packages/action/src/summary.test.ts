import type { CompatibilityFinding } from "@playbookdiff/core";
import type { DiffJsonOutput } from "playbookdiff";
import { describe, expect, it } from "vitest";
import { escapeMarkdown, renderStepSummary } from "./summary.js";

function finding(overrides: Partial<CompatibilityFinding> = {}): CompatibilityFinding {
  return {
    id: "instruction:missing:right:example:abc123456789",
    category: "instruction",
    type: "missing",
    severity: "medium",
    confidence: "deterministic",
    explanation: "Claude Code has an instruction with no Codex equivalent.",
    evidence: [],
    ...overrides,
  };
}

function makeJson(diff: Partial<DiffJsonOutput["diff"]> = {}): DiffJsonOutput {
  return {
    context: { repository: ".", cwd: ".", targetPath: "apps/web/src/page.tsx" },
    baseline: {
      revision: "main",
      commit: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      diagnostics: { claude: [], codex: [] },
    },
    candidate: {
      revision: "HEAD",
      commit: "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5",
      diagnostics: { claude: [], codex: [] },
    },
    diff: {
      introduced: [],
      resolved: [],
      unchanged: [],
      summary: {
        introduced: 0,
        introducedActionable: 0,
        introducedInformational: 0,
        resolved: 0,
        unchanged: 0,
      },
      ...diff,
    },
  };
}

describe("escapeMarkdown", () => {
  it("escapes characters that could break Markdown structure", () => {
    expect(escapeMarkdown("a*b_c[d]e<f>g|h`i\\j")).toBe("a\\*b\\_c\\[d\\]e\\<f\\>g\\|h\\`i\\\\j");
  });

  it("leaves ordinary prose untouched", () => {
    expect(escapeMarkdown("Run tests before pushing.")).toBe("Run tests before pushing.");
  });
});

describe("renderStepSummary", () => {
  it("shows short SHAs, revision labels, and cwd/target context", () => {
    const output = renderStepSummary(makeJson());
    expect(output).toContain("**Baseline:** main (`a1b2c3d`)");
    expect(output).toContain("**Candidate:** HEAD (`f6e5d4c`)");
    expect(output).toContain("**Target:** apps/web/src/page.tsx");
  });

  it("shows a success result with no Introduced/Resolved sections when nothing changed", () => {
    const output = renderStepSummary(makeJson());
    expect(output).toContain("✅ No new actionable Claude Code ↔ Codex compatibility regressions.");
    expect(output).not.toContain("## Introduced");
    expect(output).not.toContain("## Resolved");
  });

  it("shows a failing result with full detail for each introduced actionable finding", () => {
    const introduced = finding({ id: "skill:capability-gap:right:deploy:zzz999999999" });
    const output = renderStepSummary(
      makeJson({
        introduced: [introduced],
        summary: {
          introduced: 1,
          introducedActionable: 1,
          introducedInformational: 0,
          resolved: 0,
          unchanged: 0,
        },
      }),
    );
    expect(output).toContain("❌ 1 new actionable compatibility regression");
    expect(output).toContain("## Introduced");
    expect(output).toContain("### MEDIUM — Instruction missing");
    expect(output).toContain(introduced.explanation);
    expect(output).toContain(`Finding ID: \`${introduced.id}\``);
  });

  it("shows resolved findings as a count only, not full detail", () => {
    const resolved = finding({ id: "instruction:missing:right:resolved-one:1111111111" });
    const output = renderStepSummary(
      makeJson({
        resolved: [resolved],
        summary: {
          introduced: 0,
          introducedActionable: 0,
          introducedInformational: 0,
          resolved: 1,
          unchanged: 0,
        },
      }),
    );
    expect(output).toContain("## Resolved");
    expect(output).toContain("1 finding resolved.");
    expect(output).not.toContain(resolved.id);
    expect(output).toContain("✅ No new actionable");
  });

  it("shows unchanged findings as a count only under Existing", () => {
    const output = renderStepSummary(
      makeJson({
        summary: {
          introduced: 0,
          introducedActionable: 0,
          introducedInformational: 0,
          resolved: 0,
          unchanged: 2,
        },
      }),
    );
    expect(output).toContain("## Existing");
    expect(output).toContain("2 pre-existing findings remain unchanged.");
  });

  it("shows new informational findings without claiming a regression", () => {
    const info = finding({
      id: "instruction:unknown:bucket:2222222222",
      type: "unknown",
      severity: "info",
    });
    const output = renderStepSummary(
      makeJson({
        introduced: [info],
        summary: {
          introduced: 1,
          introducedActionable: 0,
          introducedInformational: 1,
          resolved: 0,
          unchanged: 0,
        },
      }),
    );
    expect(output).toContain("✅ No new actionable");
    expect(output).toContain("1 new informational finding");
    expect(output).toContain("### INFO — Instruction unknown");
  });

  it("escapes Markdown-breaking characters found in repository-controlled content", () => {
    const malicious = finding({
      explanation: "Uses `backtick` and *asterisk* and [link](javascript:alert(1))",
      evidence: [
        {
          source: { path: "weird`*_[path].md", scope: "repository" },
          excerpt: "some <script>alert(1)</script> content",
          reason: "Claude Code instruction",
        },
      ],
    });
    const output = renderStepSummary(
      makeJson({
        introduced: [malicious],
        summary: {
          introduced: 1,
          introducedActionable: 1,
          introducedInformational: 0,
          resolved: 0,
          unchanged: 0,
        },
      }),
    );
    expect(output).not.toContain("[link](javascript:alert(1))");
    expect(output).not.toContain("<script>alert(1)</script>");
    expect(output).toContain("\\[link\\]");
    expect(output).toContain("\\<script\\>");
  });

  it("never leaks a host temporary directory path", () => {
    const output = renderStepSummary(makeJson());
    expect(output).not.toMatch(/\/(tmp|var)\//);
    expect(output).not.toContain("_temp");
  });

  it("is deterministic for identical input", () => {
    const json = makeJson({
      introduced: [finding()],
      summary: {
        introduced: 1,
        introducedActionable: 1,
        introducedInformational: 0,
        resolved: 0,
        unchanged: 0,
      },
    });
    expect(renderStepSummary(json)).toBe(renderStepSummary(json));
  });
});
