import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runGit } from "./exec.js";
import { withMaterializedRevision } from "./materialize.js";
import { createTestGitRepo } from "./test-repo.js";

async function worktreeList(repository: string): Promise<string> {
  const { stdout } = await runGit(["worktree", "list", "--porcelain"], { cwd: repository });
  return stdout;
}

describe("withMaterializedRevision", () => {
  it("checks out the exact requested commit's files into the callback directory", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("marker.txt", "first");
      const first = await repo.commitAll("first");
      await repo.writeFile("marker.txt", "second");
      await repo.commitAll("second");

      await withMaterializedRevision(repo.root, first, "baseline", async (directory, commit) => {
        expect(commit).toBe(first);
        const content = await fs.readFile(path.join(directory, "marker.txt"), "utf8");
        expect(content).toBe("first");
      });
    } finally {
      await repo.cleanup();
    }
  });

  it("materializes baseline and candidate independently with different content", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("marker.txt", "baseline-content");
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("marker.txt", "candidate-content");
      const candidate = await repo.commitAll("candidate");

      const [baselineContent, candidateContent] = await Promise.all([
        withMaterializedRevision(repo.root, baseline, "baseline", (dir) =>
          fs.readFile(path.join(dir, "marker.txt"), "utf8"),
        ),
        withMaterializedRevision(repo.root, candidate, "candidate", (dir) =>
          fs.readFile(path.join(dir, "marker.txt"), "utf8"),
        ),
      ]);

      expect(baselineContent).toBe("baseline-content");
      expect(candidateContent).toBe("candidate-content");
    } finally {
      await repo.cleanup();
    }
  });

  it("never changes the active branch or HEAD of the repository being analyzed", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      const first = await repo.commitAll("first");
      await repo.writeFile("a.txt", "b");
      const second = await repo.commitAll("second");

      const { stdout: branchBefore } = await runGit(["branch", "--show-current"], {
        cwd: repo.root,
      });
      const headBefore = await repo.currentCommit();

      await withMaterializedRevision(repo.root, first, "baseline", async () => {
        const { stdout: branchDuring } = await runGit(["branch", "--show-current"], {
          cwd: repo.root,
        });
        expect(branchDuring).toBe(branchBefore);
      });

      const { stdout: branchAfter } = await runGit(["branch", "--show-current"], {
        cwd: repo.root,
      });
      const headAfter = await repo.currentCommit();
      expect(branchAfter).toBe(branchBefore);
      expect(headAfter).toBe(headBefore);
      expect(headAfter).toBe(second);
    } finally {
      await repo.cleanup();
    }
  });

  it("leaves a dirty working tree (staged, unstaged, and untracked changes) completely untouched", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("tracked.txt", "committed");
      const commit = await repo.commitAll("initial");

      await repo.writeFile("tracked.txt", "unstaged-edit");
      await repo.writeFile("staged.txt", "staged-content");
      await runGit(["add", "staged.txt"], { cwd: repo.root });
      await repo.writeFile("untracked.txt", "untracked-content");

      const statusBefore = await runGit(["status", "--porcelain"], { cwd: repo.root });

      await withMaterializedRevision(repo.root, commit, "baseline", async (directory) => {
        const snapshotContent = await fs.readFile(path.join(directory, "tracked.txt"), "utf8");
        expect(snapshotContent).toBe("committed");
      });

      const statusAfter = await runGit(["status", "--porcelain"], { cwd: repo.root });
      expect(statusAfter.stdout).toBe(statusBefore.stdout);
      expect(await fs.readFile(path.join(repo.root, "tracked.txt"), "utf8")).toBe("unstaged-edit");
      expect(await fs.readFile(path.join(repo.root, "staged.txt"), "utf8")).toBe("staged-content");
      expect(await fs.readFile(path.join(repo.root, "untracked.txt"), "utf8")).toBe(
        "untracked-content",
      );
    } finally {
      await repo.cleanup();
    }
  });

  it("removes the temporary worktree and directory after a successful run", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      const commit = await repo.commitAll("initial");
      let capturedDirectory = "";

      await withMaterializedRevision(repo.root, commit, "baseline", async (directory) => {
        capturedDirectory = directory;
        await expect(fs.stat(directory)).resolves.toBeTruthy();
      });

      await expect(fs.stat(capturedDirectory)).rejects.toThrow();
      const list = await worktreeList(repo.root);
      expect(list).not.toContain(capturedDirectory);
    } finally {
      await repo.cleanup();
    }
  });

  it("never executes the analyzed repository's own Git hooks (e.g. post-checkout)", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      const commit = await repo.commitAll("initial");

      const markerPath = path.join(repo.root, "hook-ran.marker");
      const hookPath = path.join(repo.root, ".git", "hooks", "post-checkout");
      await fs.writeFile(hookPath, `#!/bin/sh\ntouch "${markerPath}"\n`, { mode: 0o755 });

      await withMaterializedRevision(repo.root, commit, "baseline", async () => {});

      await expect(fs.stat(markerPath)).rejects.toThrow();
    } finally {
      await repo.cleanup();
    }
  });

  it("still removes the temporary worktree and directory when the callback throws", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      const commit = await repo.commitAll("initial");
      let capturedDirectory = "";

      await expect(
        withMaterializedRevision(repo.root, commit, "baseline", async (directory) => {
          capturedDirectory = directory;
          throw new Error("simulated analysis failure");
        }),
      ).rejects.toThrow("simulated analysis failure");

      await expect(fs.stat(capturedDirectory)).rejects.toThrow();
      const list = await worktreeList(repo.root);
      expect(list).not.toContain(capturedDirectory);
    } finally {
      await repo.cleanup();
    }
  });
});
