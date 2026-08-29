import path from "node:path";
import { compareEffectiveConfigs } from "@playbookdiff/core";
import { compileClaudeConfig } from "@playbookdiff/harness-claude";
import { describe, expect, it } from "vitest";
import { compileCodexConfig } from "./compile.js";

const repositoryRoot = path.join(
  import.meta.dirname,
  "..",
  "test",
  "fixtures",
  "cross-harness",
  "cwd-target",
);

describe("cross-harness cwd and target discovery asymmetry", () => {
  it("Scenario A keeps Codex at cwd while Claude discovers target descendants on demand", async () => {
    const context = {
      repositoryRoot,
      cwd: repositoryRoot,
      targetPath: path.join(repositoryRoot, "apps", "api", "file.ts"),
      mode: "repo" as const,
    };
    const [claude, codex] = await Promise.all([
      compileClaudeConfig(context),
      compileCodexConfig(context),
    ]);
    expect(claude.instructions.map((instruction) => instruction.source.path)).toEqual([
      "CLAUDE.md",
      "apps/api/CLAUDE.md",
    ]);
    expect(claude.instructions.map((instruction) => instruction.loadPhase)).toEqual([
      "startup",
      "on-demand",
    ]);
    expect(claude.skills.map((skill) => skill.name)).toEqual(["root-skill", "api-skill"]);

    expect(codex.instructions.map((instruction) => instruction.source.path)).toEqual(["AGENTS.md"]);
    expect(codex.skills.map((skill) => skill.name)).toEqual(["root-skill"]);

    const report = compareEffectiveConfigs(claude, codex);
    expect(
      report.findings.map(({ category, type, severity }) => ({ category, type, severity })),
    ).toEqual([
      { category: "instruction", type: "missing", severity: "medium" },
      { category: "skill", type: "capability-gap", severity: "medium" },
    ]);
    expect(report.summary).toEqual({
      counts: { high: 0, medium: 2, low: 0, info: 0 },
      byCategory: {
        instruction: { equivalent: 1, divergent: 1, unknown: 0 },
        skill: { equivalent: 1, divergent: 1, unknown: 0 },
        mcp: { equivalent: 0, divergent: 0, unknown: 0 },
      },
    });
  });

  it("Scenario B includes both root and API Codex configuration once cwd is apps/api", async () => {
    const context = {
      repositoryRoot,
      cwd: path.join(repositoryRoot, "apps", "api"),
      targetPath: path.join(repositoryRoot, "apps", "api", "file.ts"),
      mode: "repo" as const,
    };
    const [claude, codex] = await Promise.all([
      compileClaudeConfig(context),
      compileCodexConfig(context),
    ]);
    expect(claude.instructions.map((instruction) => instruction.source.path)).toEqual([
      "CLAUDE.md",
      "apps/api/CLAUDE.md",
    ]);
    expect(claude.skills.map((skill) => skill.name)).toEqual(["root-skill", "api-skill"]);

    expect(codex.instructions.map((instruction) => instruction.source.path)).toEqual([
      "AGENTS.md",
      "apps/api/AGENTS.md",
    ]);
    expect(codex.skills.map((skill) => skill.name)).toEqual(["api-skill", "root-skill"]);

    const report = compareEffectiveConfigs(claude, codex);
    expect(
      report.findings.map(({ category, type, severity }) => ({ category, type, severity })),
    ).toEqual([{ category: "instruction", type: "scope-gap", severity: "medium" }]);
    expect(report.findings.some((finding) => finding.type === "missing")).toBe(false);
    expect(report.findings.some((finding) => finding.type === "capability-gap")).toBe(false);
    expect(report.summary).toEqual({
      counts: { high: 0, medium: 1, low: 0, info: 0 },
      byCategory: {
        instruction: { equivalent: 1, divergent: 1, unknown: 0 },
        skill: { equivalent: 2, divergent: 0, unknown: 0 },
        mcp: { equivalent: 0, divergent: 0, unknown: 0 },
      },
    });
  });
});

describe("cross-harness comparator fixtures", () => {
  it("treats equivalent native layouts as fully equivalent", async () => {
    const parityRoot = path.join(
      import.meta.dirname,
      "..",
      "test",
      "fixtures",
      "comparison",
      "parity",
    );
    const context = { repositoryRoot: parityRoot, cwd: parityRoot, mode: "repo" as const };
    const [claude, codex] = await Promise.all([
      compileClaudeConfig(context),
      compileCodexConfig(context),
    ]);

    const report = compareEffectiveConfigs(claude, codex);
    expect(report.findings).toEqual([]);
    expect(report.summary).toEqual({
      counts: { high: 0, medium: 0, low: 0, info: 0 },
      byCategory: {
        instruction: { equivalent: 1, divergent: 0, unknown: 0 },
        skill: { equivalent: 1, divergent: 0, unknown: 0 },
        mcp: { equivalent: 1, divergent: 0, unknown: 0 },
      },
    });
  });

  it("reports different instruction wording as semantic unknown", async () => {
    const semanticRoot = path.join(
      import.meta.dirname,
      "..",
      "test",
      "fixtures",
      "comparison",
      "semantic-unknown",
    );
    const context = { repositoryRoot: semanticRoot, cwd: semanticRoot, mode: "repo" as const };
    const [claude, codex] = await Promise.all([
      compileClaudeConfig(context),
      compileCodexConfig(context),
    ]);

    const report = compareEffectiveConfigs(claude, codex);
    expect(report.findings).toEqual([
      expect.objectContaining({
        category: "instruction",
        type: "unknown",
        severity: "info",
        confidence: "deterministic",
      }),
    ]);
    expect(report.summary.byCategory.instruction).toEqual({
      equivalent: 0,
      divergent: 0,
      unknown: 1,
    });
  });
});
