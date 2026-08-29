import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compileCodexConfig } from "./compile.js";

const fixtureRoot = path.join(import.meta.dirname, "..", "test", "fixtures", "integration", "full");

async function snapshotTree(root: string): Promise<Map<string, string>> {
  const snapshot = new Map<string, string>();
  async function walk(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath);
      if (entry.isDirectory()) await walk(absolutePath);
      else if (entry.isSymbolicLink())
        snapshot.set(relativePath, `symlink:${await fs.readlink(absolutePath)}`);
      else if (entry.isFile()) snapshot.set(relativePath, await fs.readFile(absolutePath, "utf8"));
    }
  }
  await walk(root);
  return snapshot;
}

describe("compileCodexConfig", () => {
  it("compiles supported repository-visible surfaces into EffectiveAgentConfig", async () => {
    const config = await compileCodexConfig({
      repositoryRoot: fixtureRoot,
      cwd: fixtureRoot,
      mode: "repo",
    });
    expect(config).toMatchObject({
      harness: "codex",
      target: { repositoryRoot: ".", cwd: ".", mode: "repo" },
    });
    expect(config.instructions.map((instruction) => instruction.source.path)).toEqual([
      "AGENTS.md",
    ]);
    expect(config.skills.map((skill) => skill.name)).toEqual(["review"]);
    expect(config.mcpServers).toEqual([
      expect.objectContaining({
        name: "local",
        transport: "stdio",
        capabilities: { known: false },
      }),
    ]);
    expect(config.provenance).not.toEqual([]);
  });

  it("serializes repository-relative paths only", async () => {
    const config = await compileCodexConfig({
      repositoryRoot: fixtureRoot,
      cwd: fixtureRoot,
      mode: "repo",
    });
    expect(JSON.stringify(config)).not.toContain(fixtureRoot);
    for (const source of config.provenance.flatMap((record) => record.sources)) {
      expect(path.isAbsolute(source.path)).toBe(false);
    }
  });

  it("does not mutate the analyzed repository", async () => {
    const before = await snapshotTree(fixtureRoot);
    await compileCodexConfig({ repositoryRoot: fixtureRoot, cwd: fixtureRoot, mode: "repo" });
    expect(await snapshotTree(fixtureRoot)).toEqual(before);
  });

  it("self-dogfoods the PlaybookDiff repository root", async () => {
    const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    expect(config.instructions.map((instruction) => instruction.source.path)).toContain(
      "AGENTS.md",
    );
  });
});
