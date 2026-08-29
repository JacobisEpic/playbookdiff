import { describe, expect, it } from "vitest";
import type { EffectiveAgentConfig, EffectiveSkill, HarnessId } from "../types/index.js";
import { compareSkills, logicalSkillKey } from "./skills.js";

function skill(
  id: string,
  name: string,
  skillPath: string,
  overrides: Partial<EffectiveSkill> = {},
): EffectiveSkill {
  return {
    id,
    name,
    description: "Review changes.",
    path: skillPath,
    source: { path: skillPath, scope: "repository", format: "markdown" },
    discovery: { state: "available" },
    invocation: { explicit: "allowed", implicit: "allowed" },
    advertisement: { state: "advertised" },
    ...overrides,
  };
}

function config(harness: HarnessId, skills: EffectiveSkill[]): EffectiveAgentConfig {
  return {
    harness,
    target: { repositoryRoot: ".", cwd: ".", mode: "repo" },
    instructions: [],
    skills,
    mcpServers: [],
    provenance: [],
    diagnostics: [],
    assumptions: [],
  };
}

describe("deterministic skill comparison", () => {
  it("treats the same logical skill state as equivalent across native source paths", () => {
    const result = compareSkills(
      config("claude", [skill("left", "review", ".claude/skills/review/SKILL.md")]),
      config("codex", [skill("right", "review", ".agents/skills/review/SKILL.md")]),
    );
    expect(result.findings).toEqual([]);
    expect(result.entities[0]?.status).toBe("equivalent");
  });

  it("bridges a qualified Claude name only when its path corroborates the basename", () => {
    const qualified = skill("left", "apps/api:deploy", "apps/api/.claude/skills/deploy/SKILL.md");
    expect(logicalSkillKey(qualified)).toBe("deploy");
    const uncorroborated = skill("other", "team:deploy", ".claude/skills/release/SKILL.md");
    expect(logicalSkillKey(uncorroborated)).toBe("team:deploy");
    const result = compareSkills(
      config("claude", [qualified]),
      config("codex", [skill("right", "deploy", "apps/api/.agents/skills/deploy/SKILL.md")]),
    );
    expect(result.findings).toEqual([]);
  });

  it("reports a missing logical skill as a medium capability gap", () => {
    const result = compareSkills(
      config("claude", [skill("left", "deploy", ".claude/skills/deploy/SKILL.md")]),
      config("codex", []),
    );
    expect(result.findings[0]).toMatchObject({
      category: "skill",
      type: "capability-gap",
      severity: "medium",
      left: { present: true },
      right: { present: false },
    });
  });

  it("reports implicit invocation differences once as a capability gap", () => {
    const left = skill("left", "deploy", ".claude/skills/deploy/SKILL.md", {
      invocation: { explicit: "allowed", implicit: "blocked" },
      advertisement: { state: "hidden" },
    });
    const right = skill("right", "deploy", ".agents/skills/deploy/SKILL.md");
    const result = compareSkills(config("claude", [left]), config("codex", [right]));
    expect(result.findings.filter((finding) => finding.type === "capability-gap")).toHaveLength(1);
    expect(result.findings).toEqual([
      expect.objectContaining({ type: "capability-gap", severity: "medium" }),
    ]);
  });

  it("reports explicit invocation differences as a capability gap", () => {
    const left = skill("left", "deploy", ".claude/skills/deploy/SKILL.md", {
      invocation: { explicit: "blocked", implicit: "allowed" },
    });
    const right = skill("right", "deploy", ".agents/skills/deploy/SKILL.md");
    const result = compareSkills(config("claude", [left]), config("codex", [right]));
    expect(result.findings).toContainEqual(
      expect.objectContaining({ type: "capability-gap", severity: "medium" }),
    );
  });

  it("reports known discovery differences as a scope gap", () => {
    const left = skill("left", "deploy", ".claude/skills/deploy/SKILL.md", {
      discovery: { state: "conditional" },
    });
    const right = skill("right", "deploy", ".agents/skills/deploy/SKILL.md", {
      discovery: { state: "available" },
    });
    const result = compareSkills(config("claude", [left]), config("codex", [right]));
    expect(result.findings).toContainEqual(expect.objectContaining({ type: "scope-gap" }));
  });

  it("preserves unknown discovery as unknown instead of a gap", () => {
    const left = skill("left", "deploy", ".claude/skills/deploy/SKILL.md", {
      discovery: { state: "unknown" },
    });
    const right = skill("right", "deploy", ".agents/skills/deploy/SKILL.md");
    const result = compareSkills(config("claude", [left]), config("codex", [right]));
    expect(result.findings).toContainEqual(expect.objectContaining({ type: "unknown" }));
    expect(result.findings.some((finding) => finding.type === "scope-gap")).toBe(false);
    expect(result.entities[0]?.status).toBe("unknown");
  });

  it("reports an independent advertisement difference conservatively", () => {
    const left = skill("left", "deploy", ".claude/skills/deploy/SKILL.md", {
      advertisement: { state: "budget-risk" },
    });
    const right = skill("right", "deploy", ".agents/skills/deploy/SKILL.md");
    const result = compareSkills(config("claude", [left]), config("codex", [right]));
    expect(result.findings).toContainEqual(
      expect.objectContaining({ type: "different", severity: "low" }),
    );
  });

  it("reports description differences without claiming semantic conflict", () => {
    const left = skill("left", "deploy", ".claude/skills/deploy/SKILL.md", {
      description: "Deploy safely.",
    });
    const right = skill("right", "deploy", ".agents/skills/deploy/SKILL.md", {
      description: "Release the application.",
    });
    const result = compareSkills(config("claude", [left]), config("codex", [right]));
    expect(result.findings).toContainEqual(
      expect.objectContaining({ type: "different", severity: "low" }),
    );
    expect(result.findings.some((finding) => finding.type === "conflict")).toBe(false);
  });

  it("marks duplicate groups unknown when repository location cannot pair them", () => {
    const left = [
      skill("left-one", "deploy", ".claude/skills/deploy/SKILL.md"),
      skill("left-two", "deploy", ".claude/skills/deploy/SKILL.md"),
    ];
    const right = [
      skill("right-one", "deploy", ".agents/skills/deploy/SKILL.md"),
      skill("right-two", "deploy", ".agents/skills/deploy/SKILL.md"),
    ];
    const result = compareSkills(config("claude", left), config("codex", right));
    expect(result.findings).toEqual([expect.objectContaining({ type: "unknown" })]);
    expect(result.entities).toEqual([
      expect.objectContaining({ key: "deploy", status: "unknown" }),
    ]);
  });

  it("pairs duplicate groups by unique normalized repository location", () => {
    const left = [
      skill("left-root", "deploy", ".claude/skills/deploy/SKILL.md"),
      skill("left-api", "apps/api:deploy", "apps/api/.claude/skills/deploy/SKILL.md"),
    ];
    const right = [
      skill("right-api", "deploy", "apps/api/.agents/skills/deploy/SKILL.md"),
      skill("right-root", "deploy", ".agents/skills/deploy/SKILL.md"),
    ];
    const result = compareSkills(config("claude", left), config("codex", right));
    expect(result.findings).toEqual([]);
    expect(result.entities.filter((entity) => entity.status === "equivalent")).toHaveLength(2);
  });
});
