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

    // Both harnesses deterministically load the root and the apps/api
    // instruction here, and the fixture's nested files are byte-identical, so
    // the Scenario A gap is genuinely resolved rather than replaced by a
    // different medium finding. Claude expresses the nested file's
    // applicability as "apps/api" exactly as Codex does; encoding one adapter
    // as repository-wide and the other as directory-scoped previously
    // manufactured a scope-gap out of pure representation.
    expect(claude.instructions.map((instruction) => instruction.scope.appliesTo)).toEqual([
      ["."],
      ["apps/api"],
    ]);
    expect(codex.instructions.map((instruction) => instruction.scope.appliesTo)).toEqual([
      ["."],
      ["apps/api"],
    ]);

    const report = compareEffectiveConfigs(claude, codex);
    expect(report.findings).toEqual([]);
    expect(report.summary).toEqual({
      counts: { high: 0, medium: 0, low: 0, info: 0 },
      byCategory: {
        instruction: { equivalent: 2, divergent: 0, unknown: 0 },
        skill: { equivalent: 2, divergent: 0, unknown: 0 },
        mcp: { equivalent: 0, divergent: 0, unknown: 0 },
      },
    });
  });
});

describe("cross-harness instruction coverage", () => {
  const fixture = (name: string): string =>
    path.join(import.meta.dirname, "..", "test", "fixtures", "cross-harness", name);

  async function compileBoth(root: string) {
    const context = { repositoryRoot: root, cwd: root, mode: "repo" as const };
    const [claude, codex] = await Promise.all([
      compileClaudeConfig(context),
      compileCodexConfig(context),
    ]);
    return compareEffectiveConfigs(claude, codex);
  }

  it("keeps a substantive one-sided gap actionable when the other side only points at it", async () => {
    // Current Claude Code documentation is explicit that Claude Code reads
    // CLAUDE.md and not AGENTS.md, and that a path mention is an import only
    // with `@` syntax outside code spans. A prose pointer therefore delivers
    // none of the referenced instructions, and a three-line pointer file must
    // not downgrade that gap below the severity it has when no CLAUDE.md
    // exists at all.
    const report = await compileBoth(fixture("pointer-stub"));
    const coverage = report.findings.filter((finding) => finding.type === "missing");
    expect(coverage).toHaveLength(1);
    expect(coverage[0]?.severity).toBe("medium");
    expect(coverage[0]?.evidence[0]?.source.path).toBe("AGENTS.md");
    expect(report.summary.counts.medium).toBe(1);
    expect(report.summary.byCategory.instruction?.divergent).toBe(1);
  });

  it("treats a valid @AGENTS.md import as fully equivalent", async () => {
    const report = await compileBoth(fixture("valid-import"));
    expect(report.findings).toEqual([]);
    expect(report.summary).toEqual({
      counts: { high: 0, medium: 0, low: 0, info: 0 },
      byCategory: {
        instruction: { equivalent: 1, divergent: 0, unknown: 0 },
        skill: { equivalent: 0, divergent: 0, unknown: 0 },
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
