import { describe, expect, it } from "vitest";
import type {
  EffectiveAgentConfig,
  EffectiveInstruction,
  EffectiveMcpServer,
  EffectiveSkill,
  HarnessId,
} from "../types/index.js";
import { compareEffectiveConfigs } from "./compare.js";

const source = { path: "AGENTS.md", scope: "repository" as const, format: "markdown" };

function instruction(id: string, content: string): EffectiveInstruction {
  return {
    id,
    content,
    source,
    scope: { appliesTo: ["."] },
    loadPhase: "startup",
  };
}

function skill(id: string, description = "Review changes."): EffectiveSkill {
  const skillPath = ".agents/skills/review/SKILL.md";
  return {
    id,
    name: "review",
    description,
    path: skillPath,
    source: { ...source, path: skillPath },
    discovery: { state: "available" },
    invocation: { explicit: "allowed", implicit: "allowed" },
    advertisement: { state: "advertised" },
  };
}

function server(id: string, command = "database-server"): EffectiveMcpServer {
  return {
    id,
    name: "database",
    transport: "stdio",
    command,
    source: { ...source, path: ".codex/config.toml", format: "toml" },
    capabilities: { known: false },
  };
}

function config(
  harness: HarnessId,
  overrides: Partial<EffectiveAgentConfig> = {},
): EffectiveAgentConfig {
  return {
    harness,
    target: { repositoryRoot: ".", cwd: ".", mode: "repo" },
    instructions: [],
    skills: [],
    mcpServers: [],
    provenance: [],
    diagnostics: [],
    assumptions: [],
    ...overrides,
  };
}

function deepFreeze(value: unknown): void {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
}

describe("compareEffectiveConfigs", () => {
  it("returns a fully equivalent report for normalized parity", () => {
    const left = config("claude", {
      instructions: [instruction("left-instruction", "Run tests.\n")],
      skills: [skill("left-skill")],
      mcpServers: [server("left-server")],
    });
    const right = config("codex", {
      instructions: [instruction("right-instruction", "Run tests.")],
      skills: [skill("right-skill")],
      mcpServers: [server("right-server")],
    });

    expect(compareEffectiveConfigs(left, right)).toMatchObject({
      left,
      right,
      findings: [],
      summary: {
        counts: { high: 0, medium: 0, low: 0, info: 0 },
        byCategory: {
          instruction: { equivalent: 1, divergent: 0, unknown: 0 },
          skill: { equivalent: 1, divergent: 0, unknown: 0 },
          mcp: { equivalent: 1, divergent: 0, unknown: 0 },
        },
      },
    });
  });

  it("combines categories, orders findings stably, and summarizes logical entities", () => {
    const left = config("claude", {
      instructions: [instruction("left-instruction", "Run tests.")],
      skills: [skill("left-skill", "Review safely.")],
      mcpServers: [server("left-server", "left-command")],
    });
    const right = config("codex", {
      instructions: [instruction("right-instruction", "Check tests.")],
      skills: [skill("right-skill", "Inspect changes.")],
      mcpServers: [server("right-server", "right-command")],
    });
    const report = compareEffectiveConfigs(left, right);

    expect(report.findings.map((finding) => finding.category)).toEqual([
      "instruction",
      "skill",
      "mcp",
    ]);
    expect(report.summary).toEqual({
      counts: { high: 0, medium: 1, low: 1, info: 1 },
      byCategory: {
        instruction: { equivalent: 0, divergent: 0, unknown: 1 },
        skill: { equivalent: 0, divergent: 1, unknown: 0 },
        mcp: { equivalent: 0, divergent: 1, unknown: 0 },
      },
    });
  });

  it("does not mutate deeply frozen inputs", () => {
    const left = config("claude", {
      instructions: [instruction("left", "Run tests.")],
      skills: [skill("left")],
      mcpServers: [server("left")],
    });
    const right = config("codex", {
      instructions: [instruction("right", "Run tests.")],
      skills: [skill("right")],
      mcpServers: [server("right")],
    });
    deepFreeze(left);
    deepFreeze(right);

    const report = compareEffectiveConfigs(left, right);
    expect(report.left).toBe(left);
    expect(report.right).toBe(right);
  });

  it("returns JSON-serializable output", () => {
    const report = compareEffectiveConfigs(config("claude"), config("codex"));
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });

  it("keeps existing finding IDs and ordering stable when unrelated input is added", () => {
    const left = config("claude", { mcpServers: [server("left", "left-command")] });
    const right = config("codex", { mcpServers: [server("right", "right-command")] });
    const before = compareEffectiveConfigs(left, right);
    const after = compareEffectiveConfigs(
      { ...left, instructions: [instruction("same-left", "Same.")] },
      { ...right, instructions: [instruction("same-right", "Same.")] },
    );

    expect(after.findings.map((finding) => finding.id)).toEqual(
      before.findings.map((finding) => finding.id),
    );
  });

  it("does not put absolute target paths into finding IDs", () => {
    const left = config("claude", {
      target: { repositoryRoot: "/Users/alice/project", cwd: "/Users/alice/project", mode: "repo" },
      skills: [skill("left")],
    });
    const right = config("codex");
    const report = compareEffectiveConfigs(left, right);

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.id).not.toContain("Users");
    expect(report.findings[0]?.id).not.toContain("alice");
  });
});
