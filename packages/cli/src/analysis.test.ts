import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeRepository, isAnalysisContextError } from "./analysis.js";
import { cwdTargetFixture, parityFixture } from "./test-fixtures.js";

describe("analyzeRepository", () => {
  it("threads repositoryRoot, cwd, and targetPath into both adapters identically", async () => {
    const { claude, codex } = await analyzeRepository({
      repository: cwdTargetFixture,
      cwd: "apps/api",
      targetPath: "apps/api/file.ts",
    });

    expect(claude.target).toEqual({
      repositoryRoot: ".",
      cwd: "apps/api",
      targetPath: "apps/api/file.ts",
      mode: "repo",
    });
    expect(codex.target).toEqual(claude.target);
  });

  it("keeps cwd and targetPath distinct: launching from root still exposes a nested target", async () => {
    const { claude, codex } = await analyzeRepository({
      repository: cwdTargetFixture,
      cwd: ".",
      targetPath: "apps/api/file.ts",
    });
    expect(claude.target.cwd).toBe(".");
    expect(claude.target.targetPath).toBe("apps/api/file.ts");
    expect(codex.target.cwd).toBe(".");
    // Codex configuration discovery is launch-cwd-bounded: it must not pick up
    // apps/api/AGENTS.md just because targetPath points there.
    expect(codex.instructions.map((i) => i.source.path)).toEqual(["AGENTS.md"]);
  });

  it("omits targetPath entirely when not provided, rather than passing undefined", async () => {
    const { claude } = await analyzeRepository({ repository: parityFixture, cwd: "." });
    expect(claude.target.targetPath).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(claude.target, "targetPath")).toBe(false);
  });

  it("rejects a nonexistent repository", async () => {
    await expect(
      analyzeRepository({ repository: path.join(parityFixture, "does-not-exist"), cwd: "." }),
    ).rejects.toSatisfy(isAnalysisContextError);
  });

  it("rejects a repository argument that points to a file", async () => {
    const filePath = path.join(parityFixture, "CLAUDE.md");
    await expect(analyzeRepository({ repository: filePath, cwd: "." })).rejects.toSatisfy(
      isAnalysisContextError,
    );
  });

  it("rejects a cwd that escapes the repository via ../", async () => {
    await expect(
      analyzeRepository({ repository: parityFixture, cwd: "../../etc" }),
    ).rejects.toSatisfy(isAnalysisContextError);
  });

  it("rejects a targetPath that escapes the repository via ../", async () => {
    await expect(
      analyzeRepository({ repository: parityFixture, cwd: ".", targetPath: "../outside.ts" }),
    ).rejects.toSatisfy(isAnalysisContextError);
  });

  it("does not modify the analyzed repository (read-only)", async () => {
    async function snapshot(root: string): Promise<Map<string, string>> {
      const result = new Map<string, string>();
      async function walk(dir: string): Promise<void> {
        for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
          const entryPath = path.join(dir, entry.name);
          if (entry.isDirectory()) await walk(entryPath);
          else if (entry.isFile())
            result.set(path.relative(root, entryPath), await fs.readFile(entryPath, "utf8"));
        }
      }
      await walk(root);
      return result;
    }

    const before = await snapshot(cwdTargetFixture);
    await analyzeRepository({
      repository: cwdTargetFixture,
      cwd: "apps/api",
      targetPath: "apps/api/file.ts",
    });
    const after = await snapshot(cwdTargetFixture);
    expect(after).toEqual(before);
  });
});
