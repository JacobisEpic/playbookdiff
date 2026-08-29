import { describe, expect, it } from "vitest";
import { createTestGitRepo } from "./test-repo.js";
import {
  InvalidRevisionRangeError,
  RevisionResolutionError,
  parseRevisionRange,
  resolveRevision,
} from "./revisions.js";

describe("parseRevisionRange", () => {
  it("parses a simple branch..HEAD range", () => {
    expect(parseRevisionRange("main..HEAD")).toEqual({ baseline: "main", candidate: "HEAD" });
  });

  it("parses revisions containing Git's own special syntax", () => {
    expect(parseRevisionRange("HEAD~1..HEAD")).toEqual({ baseline: "HEAD~1", candidate: "HEAD" });
    expect(parseRevisionRange("refs/heads/main..abc123")).toEqual({
      baseline: "refs/heads/main",
      candidate: "abc123",
    });
    expect(parseRevisionRange("HEAD^..HEAD")).toEqual({ baseline: "HEAD^", candidate: "HEAD" });
  });

  it.each([
    ["main", "no separator at all"],
    ["main...", "triple-dot merge-base syntax"],
    ["main...HEAD", "triple-dot merge-base syntax"],
    ["..HEAD", "empty baseline"],
    ["main..", "empty candidate"],
    ["foo..bar..baz", "more than one range"],
    ["", "empty string"],
  ])("rejects %j (%s)", (range) => {
    expect(() => parseRevisionRange(range)).toThrow(InvalidRevisionRangeError);
  });
});

describe("resolveRevision", () => {
  it("resolves a branch name to a full commit SHA", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      const commit = await repo.commitAll("initial");
      const resolved = await resolveRevision(repo.root, "main", "baseline");
      expect(resolved).toBe(commit);
      expect(resolved).toMatch(/^[0-9a-f]{40}$/);
    } finally {
      await repo.cleanup();
    }
  });

  it("resolves HEAD and HEAD~1", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      const first = await repo.commitAll("first");
      await repo.writeFile("a.txt", "b");
      const second = await repo.commitAll("second");
      await expect(resolveRevision(repo.root, "HEAD", "candidate")).resolves.toBe(second);
      await expect(resolveRevision(repo.root, "HEAD~1", "baseline")).resolves.toBe(first);
    } finally {
      await repo.cleanup();
    }
  });

  it("resolves a full commit SHA to itself", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      const commit = await repo.commitAll("initial");
      await expect(resolveRevision(repo.root, commit, "baseline")).resolves.toBe(commit);
    } finally {
      await repo.cleanup();
    }
  });

  it("throws RevisionResolutionError, naming the side, for an unknown ref", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      await repo.commitAll("initial");
      await expect(resolveRevision(repo.root, "does-not-exist", "candidate")).rejects.toThrow(
        RevisionResolutionError,
      );
      await expect(resolveRevision(repo.root, "does-not-exist", "candidate")).rejects.toThrow(
        /candidate revision "does-not-exist"/,
      );
    } finally {
      await repo.cleanup();
    }
  });

  it("never runs an implicit fetch: an unresolvable remote-tracking ref fails cleanly", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      await repo.commitAll("initial");
      await expect(resolveRevision(repo.root, "origin/main", "baseline")).rejects.toThrow(
        RevisionResolutionError,
      );
    } finally {
      await repo.cleanup();
    }
  });
});
