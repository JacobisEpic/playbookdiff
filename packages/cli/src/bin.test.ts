import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runGit } from "./git/exec.js";
import { createTestGitRepo } from "./git/test-repo.js";
import { cwdTargetFixture, parityFixture, semanticUnknownFixture } from "./test-fixtures.js";

const binPath = path.join(import.meta.dirname, "..", "dist", "bin.js");

function run(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [binPath, ...args], { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe("built playbookdiff binary", () => {
  it("--version exits 0 and prints a bare version string", () => {
    const { status, stdout, stderr } = run(["--version"]);
    expect(status).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(stderr).toBe("");
  });

  it("--help exits 0", () => {
    const { status, stdout } = run(["--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("USAGE");
  });

  it("check on the parity fixture exits 0", () => {
    const { status, stdout } = run(["check", parityFixture]);
    expect(status).toBe(0);
    expect(stdout).toContain("PlaybookDiff");
  });

  it("check on the Scenario A fixture exits 1 with two medium findings", () => {
    const { status, stdout } = run(["check", cwdTargetFixture, "--path", "apps/api/file.ts"]);
    expect(status).toBe(1);
    expect(stdout).toContain("Instruction missing");
    expect(stdout).toContain("Skill capability gap");
  });

  it("check on the semantic-unknown fixture exits 0", () => {
    const { status } = run(["check", semanticUnknownFixture]);
    expect(status).toBe(0);
  });

  it("check --json produces parseable JSON on stdout with an empty stderr", () => {
    const { status, stdout, stderr } = run(["check", parityFixture, "--json"]);
    expect(status).toBe(0);
    expect(stderr).toBe("");
    expect(() => JSON.parse(stdout)).not.toThrow();
  });

  it("explain round-trips a finding ID produced by check", () => {
    const checkResult = run(["check", cwdTargetFixture, "--path", "apps/api/file.ts", "--json"]);
    const findingId: string = JSON.parse(checkResult.stdout).report.findings[0].id;

    const { status, stdout } = run([
      "explain",
      findingId,
      cwdTargetFixture,
      "--path",
      "apps/api/file.ts",
    ]);
    expect(status).toBe(0);
    expect(stdout).toContain(`Finding: ${findingId}`);
  });

  it("explain with an unknown finding ID exits 2 with a clean message", () => {
    const { status, stdout, stderr } = run(["explain", "does-not-exist", parityFixture]);
    expect(status).toBe(2);
    expect(stdout).toBe("");
    expect(stderr).toContain("was not found");
  });

  it("a nonexistent repository exits 2 without a stack trace", () => {
    const { status, stderr } = run(["check", "/no/such/repository"]);
    expect(status).toBe(2);
    expect(stderr).toMatch(/^Error: /);
    expect(stderr).not.toContain(".js:");
  });

  it("is deterministic across repeated runs against the same fixture", () => {
    const first = run(["check", cwdTargetFixture, "--path", "apps/api/file.ts", "--json"]);
    const second = run(["check", cwdTargetFixture, "--path", "apps/api/file.ts", "--json"]);
    expect(first.stdout).toBe(second.stdout);
  });

  it("diff --help exits 0", () => {
    const { status, stdout } = run(["diff", "--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("USAGE");
    expect(stdout).toContain("RANGE");
  });

  it("diff reports no new actionable regression when a candidate resolves a baseline finding", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("AGENTS.md", "Run tests before pushing.\n");
      const candidate = await repo.commitAll("candidate: resolve the gap");

      const { status, stdout } = run(["diff", `${baseline}..${candidate}`, repo.root]);
      expect(status).toBe(0);
      expect(stdout).toContain("Baseline: ");
      expect(stdout).toContain("Candidate: ");
      expect(stdout).toContain("Resolved");
      expect(stdout).toContain("Result: no new actionable compatibility regressions");
    } finally {
      await repo.cleanup();
    }
  });

  it("diff exits 1 when the candidate introduces a new actionable regression", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      await repo.writeFile("AGENTS.md", "Run tests before pushing.\n");
      const baseline = await repo.commitAll("baseline: parity");
      await repo.removeFile("AGENTS.md");
      const candidate = await repo.commitAll("candidate: drop AGENTS.md");

      const { status, stdout } = run(["diff", `${baseline}..${candidate}`, repo.root, "--json"]);
      expect(status).toBe(1);
      const parsed = JSON.parse(stdout);
      expect(parsed.diff.summary.introducedActionable).toBe(1);
    } finally {
      await repo.cleanup();
    }
  });

  it("diff --json is deterministic across repeated runs and contains no host temp paths", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("AGENTS.md", "Run tests before pushing.\n");
      const candidate = await repo.commitAll("candidate");

      const first = run(["diff", `${baseline}..${candidate}`, repo.root, "--json"]);
      const second = run(["diff", `${baseline}..${candidate}`, repo.root, "--json"]);
      expect(first.stdout).toBe(second.stdout);
      // The materialization directory `withMaterializedRevision` checks each
      // revision out into is always named "snapshot"; its absence proves no
      // internal worktree path leaked into output (the user's own repository
      // path, echoed back in `context`, is expected and is not this).
      expect(first.stdout).not.toContain("/snapshot");
    } finally {
      await repo.cleanup();
    }
  });

  it("diff never changes the analyzed repository's active branch, HEAD, or dirty working tree", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("AGENTS.md", "Run tests before pushing.\n");
      const candidate = await repo.commitAll("candidate");
      await repo.writeFile("CLAUDE.md", "dirty edit, never committed\n");

      const branchBefore = await runGit(["branch", "--show-current"], { cwd: repo.root });
      const headBefore = await repo.currentCommit();
      const statusBefore = await runGit(["status", "--porcelain"], { cwd: repo.root });

      const { status } = run(["diff", `${baseline}..${candidate}`, repo.root]);
      expect(status).toBe(0);

      const branchAfter = await runGit(["branch", "--show-current"], { cwd: repo.root });
      const headAfter = await repo.currentCommit();
      const statusAfter = await runGit(["status", "--porcelain"], { cwd: repo.root });
      expect(branchAfter.stdout).toBe(branchBefore.stdout);
      expect(headAfter).toBe(headBefore);
      expect(statusAfter.stdout).toBe(statusBefore.stdout);

      const worktrees = await runGit(["worktree", "list", "--porcelain"], { cwd: repo.root });
      expect(worktrees.stdout.trim().split("\n\n").length).toBe(1);
    } finally {
      await repo.cleanup();
    }
  });

  it("diff's JSON context reflects the resolved cwd (repository root by default)", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("README.md", "unrelated\n");
      const candidate = await repo.commitAll("candidate: unrelated change");

      const { status, stdout } = run(["diff", `${baseline}..${candidate}`, repo.root, "--json"]);
      expect(status).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.context.cwd).toBe(".");
    } finally {
      await repo.cleanup();
    }
  });

  it("diff with a non-Git repository exits 2 with a clean message", () => {
    const { status, stderr } = run(["diff", "main..HEAD", "/no/such/repository"]);
    expect(status).toBe(2);
    expect(stderr).toMatch(/^Error: /);
    expect(stderr).not.toContain(".js:");
  });

  it("diff with an unresolvable revision exits 2 with a clean message", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      await repo.commitAll("initial");
      const { status, stderr } = run(["diff", "does-not-exist..HEAD", repo.root]);
      expect(status).toBe(2);
      expect(stderr).toContain('could not resolve baseline revision "does-not-exist"');
    } finally {
      await repo.cleanup();
    }
  });
});
