import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compileClaudeConfig } from "./compile.js";

const fixturesRoot = path.join(import.meta.dirname, "..", "test", "fixtures");

async function snapshotTree(root: string): Promise<Map<string, string>> {
  const snapshot = new Map<string, string>();
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (entry.isFile()) {
        const relative = path.relative(root, entryPath);
        snapshot.set(relative, await fs.readFile(entryPath, "utf8"));
      }
    }
  }
  await walk(root);
  return snapshot;
}

describe("compileClaudeConfig", () => {
  it("compiles instructions, rules, skills, and MCP servers into one EffectiveAgentConfig", async () => {
    const root = path.join(fixturesRoot, "integration", "full");
    const config = await compileClaudeConfig({ repositoryRoot: root, cwd: root, mode: "repo" });

    expect(config.harness).toBe("claude");
    expect(config.target).toEqual({ repositoryRoot: ".", cwd: ".", mode: "repo" });

    // CLAUDE.md's @AGENTS.md import expands as its own segment, so both the
    // CLAUDE.md-local content and AGENTS.md's content are present.
    const paths = config.instructions.map((i) => i.source.path);
    expect(paths).toContain("CLAUDE.md");
    expect(paths).toContain("AGENTS.md");
    expect(paths).toContain(".claude/rules/style.md");

    expect(config.skills).toHaveLength(1);
    expect(config.skills[0]?.name).toBe("review");

    expect(config.mcpServers).toHaveLength(1);
    expect(config.mcpServers[0]?.transport).toBe("stdio");

    expect(config.assumptions.length).toBeGreaterThan(0);

    // Every source path in the compiled output is repo-relative, never an
    // absolute host filesystem path.
    for (const instruction of config.instructions) {
      expect(path.isAbsolute(instruction.source.path)).toBe(false);
    }
    for (const skill of config.skills) {
      expect(path.isAbsolute(skill.source.path)).toBe(false);
    }
    for (const server of config.mcpServers) {
      expect(path.isAbsolute(server.source.path)).toBe(false);
    }
  });

  it("rejects a targetPath that resolves outside repositoryRoot", async () => {
    const root = path.join(fixturesRoot, "integration", "full");
    await expect(
      compileClaudeConfig({
        repositoryRoot: root,
        cwd: root,
        targetPath: "../outside.ts",
        mode: "repo",
      }),
    ).rejects.toThrow();
  });

  it("does not mutate the analyzed repository (read-only)", async () => {
    const root = path.join(fixturesRoot, "integration", "full");
    const before = await snapshotTree(root);
    await compileClaudeConfig({
      repositoryRoot: root,
      cwd: root,
      targetPath: ".claude/skills/review/SKILL.md",
      mode: "repo",
    });
    const after = await snapshotTree(root);
    expect(after).toEqual(before);
  });
});
