import { compareEffectiveConfigs } from "@playbookdiff/core";
import { compileClaudeConfig } from "@playbookdiff/harness-claude";
import { compileCodexConfig } from "@playbookdiff/harness-codex";
import { describe, expect, it } from "vitest";
import { parityFixture } from "../test-fixtures.js";
import { buildCliContext } from "./context.js";
import { toCheckJson, toExplainJson } from "./json.js";

describe("toCheckJson", () => {
  it("produces valid, deterministic JSON preserving the report and context", async () => {
    const context = { repositoryRoot: parityFixture, cwd: parityFixture, mode: "repo" as const };
    const [claude, codex] = await Promise.all([
      compileClaudeConfig(context),
      compileCodexConfig(context),
    ]);
    const report = compareEffectiveConfigs(claude, codex);
    const cliContext = buildCliContext(".", claude);

    const first = toCheckJson(cliContext, report);
    const second = toCheckJson(cliContext, report);
    expect(first).toBe(second);

    const parsed = JSON.parse(first);
    expect(parsed.context).toEqual({ repository: ".", cwd: "." });
    expect(parsed.report.findings).toEqual([]);
    expect(parsed.report.summary.byCategory.instruction).toEqual({
      equivalent: 1,
      divergent: 0,
      unknown: 0,
    });
    expect(first).not.toMatch(/\[/); // no ANSI escapes
  });
});

describe("toExplainJson", () => {
  it("returns the exact matched finding under a minimal context wrapper", async () => {
    const context = { repositoryRoot: parityFixture, cwd: parityFixture, mode: "repo" as const };
    const claude = await compileClaudeConfig(context);
    const cliContext = buildCliContext(".", claude);
    const fakeFinding = {
      id: "instruction:missing:left:test:abc123",
      category: "instruction" as const,
      type: "missing" as const,
      severity: "medium" as const,
      confidence: "deterministic" as const,
      explanation: "test",
      evidence: [],
    };

    const json = toExplainJson(cliContext, fakeFinding);
    const parsed = JSON.parse(json);
    expect(parsed.finding).toEqual(fakeFinding);
    expect(parsed.context).toEqual({ repository: ".", cwd: "." });
  });
});
