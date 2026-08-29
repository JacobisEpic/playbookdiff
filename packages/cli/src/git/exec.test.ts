import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createTestGitRepo } from "./test-repo.js";
import { GitCommandError, runGit } from "./exec.js";

describe("runGit", () => {
  it("captures stdout for a successful command", async () => {
    const repo = await createTestGitRepo();
    try {
      const { stdout } = await runGit(["rev-parse", "--is-inside-work-tree"], { cwd: repo.root });
      expect(stdout.trim()).toBe("true");
    } finally {
      await repo.cleanup();
    }
  });

  it("throws GitCommandError, not a raw exception, on a failing command", async () => {
    const repo = await createTestGitRepo();
    try {
      await expect(
        runGit(["rev-parse", "--verify", "does-not-exist"], { cwd: repo.root }),
      ).rejects.toBeInstanceOf(GitCommandError);
    } finally {
      await repo.cleanup();
    }
  });

  it("passes an argument containing shell metacharacters through literally, never as shell syntax", async () => {
    const repo = await createTestGitRepo();
    try {
      const marker = path.join(repo.root, "should-not-exist");
      const dangerous = "$(touch should-not-exist); rm -rf / #";
      await runGit(["rev-parse", "--verify", dangerous], { cwd: repo.root }).catch(() => {});
      await expect(fs.stat(marker)).rejects.toThrow();
    } finally {
      await repo.cleanup();
    }
  });
});
