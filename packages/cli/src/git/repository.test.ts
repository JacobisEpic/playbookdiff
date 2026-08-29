import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createTestGitRepo } from "./test-repo.js";
import { GitRepositoryError, assertGitWorkTree } from "./repository.js";

describe("assertGitWorkTree", () => {
  it("resolves without error for a real Git working tree", async () => {
    const repo = await createTestGitRepo();
    try {
      await expect(assertGitWorkTree(repo.root)).resolves.toBeUndefined();
    } finally {
      await repo.cleanup();
    }
  });

  it("rejects a nonexistent path", async () => {
    await expect(assertGitWorkTree("/no/such/repository")).rejects.toThrow(GitRepositoryError);
  });

  it("rejects a path that is a file, not a directory", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("file.txt", "content");
      await expect(assertGitWorkTree(path.join(repo.root, "file.txt"))).rejects.toThrow(
        GitRepositoryError,
      );
    } finally {
      await repo.cleanup();
    }
  });

  it("rejects a plain directory that is not a Git working tree", async () => {
    const plainDir = await fs.mkdtemp(path.join(os.tmpdir(), "playbookdiff-not-git-"));
    try {
      await expect(assertGitWorkTree(plainDir)).rejects.toThrow(GitRepositoryError);
    } finally {
      await fs.rm(plainDir, { recursive: true, force: true });
    }
  });
});
