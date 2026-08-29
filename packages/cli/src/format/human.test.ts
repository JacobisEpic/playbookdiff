import { compareEffectiveConfigs } from "@playbookdiff/core";
import { compileClaudeConfig } from "@playbookdiff/harness-claude";
import { compileCodexConfig } from "@playbookdiff/harness-codex";
import { describe, expect, it } from "vitest";
import { cwdTargetFixture, parityFixture, semanticUnknownFixture } from "../test-fixtures.js";
import { buildCliContext } from "./context.js";
import { renderCheckHuman } from "./human.js";

describe("renderCheckHuman", () => {
  it("reports header context, findings, IDs, evidence, and result for Scenario A", async () => {
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
    const cliContext = buildCliContext(".", claude);
    const output = renderCheckHuman(cliContext, report);

    expect(output).toContain("Repository: .");
    expect(output).toContain("Launch cwd: .");
    expect(output).toContain("Target: apps/api/file.ts");
    expect(output).toContain("MEDIUM");
    expect(output).toContain("Instruction missing");
    expect(output).toContain("Skill capability gap");
    for (const finding of report.findings) {
      expect(output).toContain(finding.id);
      expect(output).toContain(finding.explanation);
    }
    expect(output).toContain("Result: compatibility issues found");
    // No secret values or raw environment values should ever appear.
    expect(output).not.toMatch(/process\.env/);
  });

  it("communicates zero findings without claiming behavioral equivalence", async () => {
    const context = { repositoryRoot: parityFixture, cwd: parityFixture, mode: "repo" as const };
    const [claude, codex] = await Promise.all([
      compileClaudeConfig(context),
      compileCodexConfig(context),
    ]);
    const report = compareEffectiveConfigs(claude, codex);
    const output = renderCheckHuman(buildCliContext(".", claude), report);

    expect(output).toContain("Result: no compatibility divergence detected");
    expect(output).not.toMatch(/behavioral|identical|guarantee/i);
  });

  it("presents a semantic-unknown finding as uncertainty, not a claimed conflict", async () => {
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
    const output = renderCheckHuman(buildCliContext(".", claude), report);

    expect(output).toContain("INFO");
    expect(output).toContain("Result: no actionable compatibility issues found");
    expect(output).not.toContain("conflict");
  });
});
