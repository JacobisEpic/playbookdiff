import path from "node:path";
import { describe, expect, it } from "vitest";
import { compileCodexConfig } from "./compile.js";

const fixtures = path.join(import.meta.dirname, "..", "test", "fixtures", "instructions");

function root(name: string): string {
  return path.join(fixtures, name);
}

describe("Codex instruction discovery", () => {
  it("preserves the root-to-cwd instruction chain", async () => {
    const repositoryRoot = root("chain");
    const config = await compileCodexConfig({
      repositoryRoot,
      cwd: path.join(repositoryRoot, "apps", "api"),
      mode: "repo",
    });
    expect(config.instructions.map((instruction) => instruction.source.path)).toEqual([
      "AGENTS.md",
      "apps/api/AGENTS.md",
    ]);
    expect(config.instructions.map((instruction) => instruction.order)).toEqual([0, 1]);
  });

  it("does not extend the chain below cwd for a deeper targetPath", async () => {
    const repositoryRoot = root("chain");
    const config = await compileCodexConfig({
      repositoryRoot,
      cwd: repositoryRoot,
      targetPath: "apps/api/future.ts",
      mode: "repo",
    });
    expect(config.instructions.map((instruction) => instruction.source.path)).toEqual([
      "AGENTS.md",
    ]);
  });

  it("has the same root chain when targetPath is omitted", async () => {
    const repositoryRoot = root("chain");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    expect(config.instructions.map((instruction) => instruction.source.path)).toEqual([
      "AGENTS.md",
    ]);
  });

  it("skips an empty override and selects AGENTS.md", async () => {
    const repositoryRoot = root("precedence");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    expect(config.instructions).toHaveLength(1);
    expect(config.instructions[0]?.source.path).toBe("AGENTS.md");
    expect(config.instructions[0]?.content).toBe("Standard instructions.\n");
  });

  it("selects a non-empty override ahead of AGENTS.md", async () => {
    const repositoryRoot = root("override");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    expect(config.instructions[0]?.source.path).toBe("AGENTS.override.md");
    expect(config.provenance[0]?.resolution?.overriddenSources?.[0]?.path).toBe("AGENTS.md");
  });

  it("applies override precedence independently at a nested directory", async () => {
    const repositoryRoot = root("nested-override");
    const config = await compileCodexConfig({
      repositoryRoot,
      cwd: path.join(repositoryRoot, "apps", "api"),
      mode: "repo",
    });
    expect(config.instructions.map((instruction) => instruction.source.path)).toEqual([
      "AGENTS.md",
      "apps/api/AGENTS.override.md",
    ]);
  });

  it("uses configured fallback filenames in order", async () => {
    const repositoryRoot = root("fallback");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    expect(config.instructions[0]?.source.path).toBe("PROJECT.md");
    expect(config.provenance[0]?.sources.map((source) => source.path)).toEqual([
      "PROJECT.md",
      ".codex/config.toml",
    ]);
  });

  it("keeps AGENTS.md ahead of all configured fallbacks", async () => {
    const repositoryRoot = root("precedence");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    expect(config.instructions[0]?.source.path).toBe("AGENTS.md");
    expect(
      config.provenance[0]?.resolution?.overriddenSources?.map((source) => source.path),
    ).toEqual(["TEAM.md", "PROJECT.md"]);
  });

  it("preserves candidates and diagnoses a material byte-budget ambiguity", async () => {
    const repositoryRoot = root("budget");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    expect(config.instructions).toHaveLength(1);
    expect(config.instructions[0]?.content).toContain("longer than eight");
    expect(config.diagnostics).toContainEqual(
      expect.objectContaining({ code: "unresolved", id: expect.stringContaining("byte-limit") }),
    );
  });
});
