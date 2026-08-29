import { compareEffectiveConfigs } from "@playbookdiff/core";
import { compileClaudeConfig } from "@playbookdiff/harness-claude";
import { compileCodexConfig } from "@playbookdiff/harness-codex";
import { describe, expect, it } from "vitest";
import { cwdTargetFixture, semanticUnknownFixture } from "../test-fixtures.js";
import { buildCliContext } from "./context.js";
import { renderExplainHuman } from "./explain-human.js";

describe("renderExplainHuman", () => {
  it("renders id, severity, kind, entity, both harness sides, and the explanation", async () => {
    const context = {
      repositoryRoot: cwdTargetFixture,
      cwd: cwdTargetFixture,
      targetPath: `${cwdTargetFixture}/apps/api/file.ts`,
      mode: "repo" as const,
    };
    const [claude, codex] = await Promise.all([
      compileClaudeConfig(context),
      compileCodexConfig(context),
    ]);
    const report = compareEffectiveConfigs(claude, codex);
    const finding = report.findings.find((f) => f.type === "missing");
    expect(finding).toBeDefined();
    if (finding === undefined) throw new Error("unreachable");

    const output = renderExplainHuman(buildCliContext(".", claude), finding, {
      left: report.left.harness,
      right: report.right.harness,
    });

    expect(output).toContain(`Finding: ${finding.id}`);
    expect(output).toContain("Severity: medium");
    expect(output).toContain("Kind: missing");
    expect(output).toContain("Entity: instruction");
    expect(output).toContain("Claude Code");
    expect(output).toContain("Codex");
    expect(output).toContain(finding.explanation);
  });

  it("adds an explicit uncertainty section only for unknown findings", async () => {
    const context = {
      repositoryRoot: semanticUnknownFixture,
      cwd: semanticUnknownFixture,
      mode: "repo" as const,
    };
    const [claude, codex] = await Promise.all([
      compileClaudeConfig(context),
      compileCodexConfig(context),
    ]);
    const report = compareEffectiveConfigs(claude, codex);
    const finding = report.findings[0];
    expect(finding?.type).toBe("unknown");
    if (finding === undefined) throw new Error("unreachable");

    const output = renderExplainHuman(buildCliContext(".", claude), finding, {
      left: report.left.harness,
      right: report.right.harness,
    });

    expect(output).toContain("What PlaybookDiff does NOT know");
    // It's fine to name "conflict" while explicitly disclaiming it; it must
    // never assert that a conflict actually exists.
    expect(output).not.toMatch(/\b(is|has)\s+a\s+conflict\b/i);
  });
});
