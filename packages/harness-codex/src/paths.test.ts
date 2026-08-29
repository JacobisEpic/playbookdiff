import path from "node:path";
import { describe, expect, it } from "vitest";
import { compileCodexConfig } from "./compile.js";

const root = path.join(import.meta.dirname, "..", "test", "fixtures", "integration", "full");

describe("Codex analysis path safety", () => {
  it("rejects cwd outside repositoryRoot", async () => {
    await expect(
      compileCodexConfig({ repositoryRoot: root, cwd: path.dirname(root), mode: "repo" }),
    ).rejects.toThrow("does not resolve inside repositoryRoot");
  });

  it("rejects a future targetPath outside repositoryRoot", async () => {
    await expect(
      compileCodexConfig({
        repositoryRoot: root,
        cwd: root,
        targetPath: "../future.ts",
        mode: "repo",
      }),
    ).rejects.toThrow("does not resolve inside repositoryRoot");
  });

  it("accepts a future targetPath inside repositoryRoot", async () => {
    const config = await compileCodexConfig({
      repositoryRoot: root,
      cwd: root,
      targetPath: "future/new.ts",
      mode: "repo",
    });
    expect(config.target.targetPath).toBe("future/new.ts");
  });
});
