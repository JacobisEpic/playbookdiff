import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXIT_ACTIONABLE_FINDINGS, EXIT_ANALYSIS_ERROR, EXIT_SUCCESS } from "../exit-codes.js";
import { createTestGitRepo, type TestGitRepo } from "../git/test-repo.js";
import { runDiff } from "./diff.js";

const CLAUDE_CONTENT = "Run tests before pushing.\n";
const AGENTS_CONTENT_MATCHING = "Run tests before pushing.\n";
const REWORDED_CLAUDE_CONTENT = "Make sure the test suite passes before you push.\n";

function skillFile(name: string): string {
  return `---\nname: ${name}\ndescription: ${name} skill.\n---\n\n${name} skill.\n`;
}

async function addClaudeOnlySkill(repo: TestGitRepo, name: string): Promise<void> {
  await repo.writeFile(`.claude/skills/${name}/SKILL.md`, skillFile(name));
}

async function addMatchingSkill(repo: TestGitRepo, name: string): Promise<void> {
  await repo.writeFile(`.claude/skills/${name}/SKILL.md`, skillFile(name));
  await repo.writeFile(`.agents/skills/${name}/SKILL.md`, skillFile(name));
}

describe("runDiff", () => {
  it("Case A - pre-existing divergence only: does not fail on debt common to both revisions", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      const baseline = await repo.commitAll("baseline: claude-only instruction");
      await repo.writeFile("README.md", "unrelated change\n");
      const candidate = await repo.commitAll("candidate: unrelated readme change");

      const outcome = await runDiff({
        repository: repo.root,
        range: `${baseline}..${candidate}`,
        cwd: ".",
        json: true,
      });

      expect(outcome.exitCode).toBe(EXIT_SUCCESS);
      const parsed = JSON.parse(outcome.stdout ?? "");
      expect(parsed.diff.summary).toEqual({
        introduced: 0,
        introducedActionable: 0,
        introducedInformational: 0,
        resolved: 0,
        unchanged: 1,
      });
    } finally {
      await repo.cleanup();
    }
  });

  it("Case B - introduced regression: candidate breaks parity and fails", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      await repo.writeFile("AGENTS.md", AGENTS_CONTENT_MATCHING);
      const baseline = await repo.commitAll("baseline: parity");
      await repo.removeFile("AGENTS.md");
      const candidate = await repo.commitAll("candidate: remove AGENTS.md");

      const outcome = await runDiff({
        repository: repo.root,
        range: `${baseline}..${candidate}`,
        cwd: ".",
        json: true,
      });

      expect(outcome.exitCode).toBe(EXIT_ACTIONABLE_FINDINGS);
      const parsed = JSON.parse(outcome.stdout ?? "");
      expect(parsed.diff.summary.introducedActionable).toBe(1);
      expect(parsed.diff.introduced).toHaveLength(1);
      expect(parsed.diff.introduced[0].category).toBe("instruction");
      expect(parsed.diff.introduced[0].type).toBe("missing");
    } finally {
      await repo.cleanup();
    }
  });

  it("Case C - resolved regression: candidate fixes the only baseline finding", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      const baseline = await repo.commitAll("baseline: claude-only instruction");
      await repo.writeFile("AGENTS.md", AGENTS_CONTENT_MATCHING);
      const candidate = await repo.commitAll("candidate: add matching AGENTS.md");

      const outcome = await runDiff({
        repository: repo.root,
        range: `${baseline}..${candidate}`,
        cwd: ".",
        json: true,
      });

      expect(outcome.exitCode).toBe(EXIT_SUCCESS);
      const parsed = JSON.parse(outcome.stdout ?? "");
      expect(parsed.diff.summary).toEqual({
        introduced: 0,
        introducedActionable: 0,
        introducedInformational: 0,
        resolved: 1,
        unchanged: 0,
      });
    } finally {
      await repo.cleanup();
    }
  });

  it("Case D - existing + new: baseline debt persists while a new regression is introduced", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      const baseline = await repo.commitAll("baseline: claude-only instruction");
      await addClaudeOnlySkill(repo, "deploy");
      const candidate = await repo.commitAll("candidate: add claude-only skill");

      const outcome = await runDiff({
        repository: repo.root,
        range: `${baseline}..${candidate}`,
        cwd: ".",
        json: true,
      });

      expect(outcome.exitCode).toBe(EXIT_ACTIONABLE_FINDINGS);
      const parsed = JSON.parse(outcome.stdout ?? "");
      expect(parsed.diff.summary.unchanged).toBe(1);
      expect(parsed.diff.summary.introducedActionable).toBe(1);
      expect(parsed.diff.introduced[0].category).toBe("skill");
      expect(parsed.diff.unchanged[0].category).toBe("instruction");
    } finally {
      await repo.cleanup();
    }
  });

  it("Case E - new unknown only: informational uncertainty never fails the diff", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      await repo.writeFile("AGENTS.md", AGENTS_CONTENT_MATCHING);
      const baseline = await repo.commitAll("baseline: parity");
      await repo.writeFile("CLAUDE.md", REWORDED_CLAUDE_CONTENT);
      const candidate = await repo.commitAll("candidate: reword CLAUDE.md prose");

      const outcome = await runDiff({
        repository: repo.root,
        range: `${baseline}..${candidate}`,
        cwd: ".",
        json: true,
      });

      expect(outcome.exitCode).toBe(EXIT_SUCCESS);
      const parsed = JSON.parse(outcome.stdout ?? "");
      expect(parsed.diff.summary.introducedActionable).toBe(0);
      expect(parsed.diff.summary.introducedInformational).toBe(1);
      expect(parsed.diff.introduced[0].type).toBe("unknown");
      expect(parsed.diff.introduced[0].severity).toBe("info");
    } finally {
      await repo.cleanup();
    }
  });

  it("Case F - fix one, introduce another: exits 1 driven only by the new actionable finding", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      const baseline = await repo.commitAll("baseline: claude-only instruction");
      await repo.writeFile("AGENTS.md", AGENTS_CONTENT_MATCHING);
      await addClaudeOnlySkill(repo, "deploy");
      const candidate = await repo.commitAll("candidate: fix instruction, add claude-only skill");

      const outcome = await runDiff({
        repository: repo.root,
        range: `${baseline}..${candidate}`,
        cwd: ".",
        json: true,
      });

      expect(outcome.exitCode).toBe(EXIT_ACTIONABLE_FINDINGS);
      const parsed = JSON.parse(outcome.stdout ?? "");
      expect(parsed.diff.summary.resolved).toBe(1);
      expect(parsed.diff.summary.introducedActionable).toBe(1);
      expect(parsed.diff.resolved[0].category).toBe("instruction");
      expect(parsed.diff.introduced[0].category).toBe("skill");
    } finally {
      await repo.cleanup();
    }
  });

  it("resolves a matched skill pair without any finding (sanity check on fixture helper)", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      await repo.writeFile("AGENTS.md", AGENTS_CONTENT_MATCHING);
      await addMatchingSkill(repo, "review");
      const baseline = await repo.commitAll("baseline: full parity");
      await repo.writeFile("README.md", "noop\n");
      const candidate = await repo.commitAll("candidate: noop");

      const outcome = await runDiff({
        repository: repo.root,
        range: `${baseline}..${candidate}`,
        cwd: ".",
        json: true,
      });
      expect(outcome.exitCode).toBe(EXIT_SUCCESS);
      const parsed = JSON.parse(outcome.stdout ?? "");
      expect(parsed.diff.summary).toEqual({
        introduced: 0,
        introducedActionable: 0,
        introducedInformational: 0,
        resolved: 0,
        unchanged: 0,
      });
    } finally {
      await repo.cleanup();
    }
  });

  it("threads a non-default --cwd and --path identically into both revisions", async () => {
    // Claude's and Codex's instruction-scoping rules genuinely differ for a
    // nested (non-root) instruction even when its content matches on both
    // sides (Claude scopes repository-wide; Codex scopes to the launch
    // directory) - see docs/harnesses - so this is not "0 findings"; it
    // proves --cwd/--path are threaded identically into both revisions by
    // checking the exact same scope-gap finding is produced for both, with
    // context reflecting the requested (non-default) values.
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("apps/web/CLAUDE.md", CLAUDE_CONTENT);
      await repo.writeFile("apps/web/AGENTS.md", AGENTS_CONTENT_MATCHING);
      const baseline = await repo.commitAll("baseline: nested instruction, launch-scoped");
      await repo.writeFile("README.md", "unrelated\n");
      const candidate = await repo.commitAll("candidate: unrelated change");

      const outcome = await runDiff({
        repository: repo.root,
        range: `${baseline}..${candidate}`,
        cwd: "apps/web",
        targetPath: "apps/web/src/page.tsx",
        json: true,
      });

      expect(outcome.exitCode).toBe(EXIT_SUCCESS);
      const parsed = JSON.parse(outcome.stdout ?? "");
      expect(parsed.context.cwd).toBe("apps/web");
      expect(parsed.context.targetPath).toBe("apps/web/src/page.tsx");
      expect(parsed.diff.summary).toEqual({
        introduced: 0,
        introducedActionable: 0,
        introducedInformational: 0,
        resolved: 0,
        unchanged: 1,
      });
      expect(parsed.diff.unchanged[0].type).toBe("scope-gap");
    } finally {
      await repo.cleanup();
    }
  });

  it("rejects a malformed revision range with exit code 2", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      await repo.commitAll("initial");
      const outcome = await runDiff({
        repository: repo.root,
        range: "main",
        cwd: ".",
        json: false,
      });
      expect(outcome.exitCode).toBe(EXIT_ANALYSIS_ERROR);
      expect(outcome.stderr).toMatch(/^Error: invalid revision range/);
    } finally {
      await repo.cleanup();
    }
  });

  it("rejects an unresolvable baseline revision with exit code 2", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      await repo.commitAll("initial");
      const outcome = await runDiff({
        repository: repo.root,
        range: "does-not-exist..HEAD",
        cwd: ".",
        json: false,
      });
      expect(outcome.exitCode).toBe(EXIT_ANALYSIS_ERROR);
      expect(outcome.stderr).toMatch(/could not resolve baseline revision "does-not-exist"/);
    } finally {
      await repo.cleanup();
    }
  });

  it("rejects a non-Git repository with exit code 2", async () => {
    const outcome = await runDiff({
      repository: "/no/such/repository",
      range: "main..HEAD",
      cwd: ".",
      json: false,
    });
    expect(outcome.exitCode).toBe(EXIT_ANALYSIS_ERROR);
    expect(outcome.stderr).toMatch(/^Error: /);
  });

  it("gives a clean error, without leaking a temp path, when cwd does not exist at one revision", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      const baseline = await repo.commitAll("baseline: no apps/web directory");
      await repo.writeFile("apps/web/CLAUDE.md", CLAUDE_CONTENT);
      const candidate = await repo.commitAll("candidate: add apps/web");

      const outcome = await runDiff({
        repository: repo.root,
        range: `${baseline}..${candidate}`,
        cwd: "apps/web",
        json: false,
      });

      expect(outcome.exitCode).toBe(EXIT_ANALYSIS_ERROR);
      expect(outcome.stderr).toMatch(/^Error: could not analyze baseline revision/);
      expect(outcome.stderr).not.toMatch(/\/(tmp|var)\//);
      expect(outcome.stderr).not.toContain(repo.root);
    } finally {
      await repo.cleanup();
    }
  });

  it("leaves a dirty working tree untouched while diffing two committed revisions", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("AGENTS.md", AGENTS_CONTENT_MATCHING);
      const candidate = await repo.commitAll("candidate");
      await repo.writeFile("CLAUDE.md", "dirty unstaged edit\n");

      const outcome = await runDiff({
        repository: repo.root,
        range: `${baseline}..${candidate}`,
        cwd: ".",
        json: false,
      });

      expect(outcome.exitCode).toBe(EXIT_SUCCESS);
      expect(await fs.readFile(path.join(repo.root, "CLAUDE.md"), "utf8")).toBe(
        "dirty unstaged edit\n",
      );
    } finally {
      await repo.cleanup();
    }
  });
});
