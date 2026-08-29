import path from "node:path";
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
  });
});
