import { describe, expect, it } from "vitest";
import { createTestGitRepo } from "./test-repo.js";
import { enrichAnalysisErrorMessage, runAction } from "./run-action.js";
import { renderStepSummary } from "./summary.js";

const CLAUDE_CONTENT = "Run tests before pushing.\n";
const AGENTS_CONTENT_MATCHING = "Run tests before pushing.\n";

describe("runAction", () => {
  it("reports success with zero regressions when nothing changed relevant to compatibility", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      const baseline = await repo.commitAll("baseline: claude-only instruction");
      await repo.writeFile("README.md", "unrelated change\n");
      const candidate = await repo.commitAll("candidate: unrelated change");

      const outcome = await runAction({
        repository: repo.root,
        baseline,
        candidate,
        cwd: ".",
      });

      expect(outcome.status).toBe("success");
      if (outcome.status !== "success") throw new Error("unreachable");
      expect(outcome.json.diff.summary.unchanged).toBe(1);
      expect(outcome.json.diff.summary.introducedActionable).toBe(0);
    } finally {
      await repo.cleanup();
    }
  });

  it("reports regressions when the candidate introduces a new actionable finding", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      await repo.writeFile("AGENTS.md", AGENTS_CONTENT_MATCHING);
      const baseline = await repo.commitAll("baseline: parity");
      await repo.removeFile("AGENTS.md");
      const candidate = await repo.commitAll("candidate: drop AGENTS.md");

      const outcome = await runAction({ repository: repo.root, baseline, candidate, cwd: "." });

      expect(outcome.status).toBe("regressions");
      if (outcome.status !== "regressions") throw new Error("unreachable");
      expect(outcome.json.diff.summary.introducedActionable).toBe(1);
      expect(outcome.json.diff.introduced[0]?.category).toBe("instruction");
    } finally {
      await repo.cleanup();
    }
  });

  it("reports success when the candidate only resolves a baseline finding", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      const baseline = await repo.commitAll("baseline: claude-only instruction");
      await repo.writeFile("AGENTS.md", AGENTS_CONTENT_MATCHING);
      const candidate = await repo.commitAll("candidate: add matching AGENTS.md");

      const outcome = await runAction({ repository: repo.root, baseline, candidate, cwd: "." });

      expect(outcome.status).toBe("success");
      if (outcome.status !== "success") throw new Error("unreachable");
      expect(outcome.json.diff.summary.resolved).toBe(1);
    } finally {
      await repo.cleanup();
    }
  });

  it("reports success when the candidate only introduces a new informational unknown", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      await repo.writeFile("AGENTS.md", AGENTS_CONTENT_MATCHING);
      const baseline = await repo.commitAll("baseline: parity");
      await repo.writeFile("CLAUDE.md", "Make sure the test suite passes before you push.\n");
      const candidate = await repo.commitAll("candidate: reword CLAUDE.md prose");

      const outcome = await runAction({ repository: repo.root, baseline, candidate, cwd: "." });

      expect(outcome.status).toBe("success");
      if (outcome.status !== "success") throw new Error("unreachable");
      expect(outcome.json.diff.summary.introducedActionable).toBe(0);
      expect(outcome.json.diff.summary.introducedInformational).toBe(1);
    } finally {
      await repo.cleanup();
    }
  });

  it("reports an analysis error, distinct from regressions, when the baseline cannot be resolved", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      const candidate = await repo.commitAll("initial");

      const outcome = await runAction({
        repository: repo.root,
        baseline: "does-not-exist",
        candidate,
        cwd: ".",
      });

      expect(outcome.status).toBe("error");
      if (outcome.status !== "error") throw new Error("unreachable");
      expect(outcome.message).toContain('could not resolve baseline revision "does-not-exist"');
    } finally {
      await repo.cleanup();
    }
  });

  it("never leaks an MCP secret value into the rendered summary for a real end-to-end regression", async () => {
    const SECRET = "super-secret-value-must-not-leak";
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", CLAUDE_CONTENT);
      const baseline = await repo.commitAll("baseline: no MCP config on either side");
      await repo.writeFile(
        ".mcp.json",
        JSON.stringify({
          mcpServers: {
            database: {
              command: "database-server",
              args: ["--safe"],
              env: { API_KEY: SECRET },
            },
          },
        }),
      );
      const candidate = await repo.commitAll("candidate: add claude-only MCP server with a secret");

      const outcome = await runAction({ repository: repo.root, baseline, candidate, cwd: "." });

      expect(outcome.status).toBe("regressions");
      if (outcome.status !== "regressions") throw new Error("unreachable");
      expect(outcome.json.diff.summary.introducedActionable).toBeGreaterThan(0);

      const serializedJson = JSON.stringify(outcome.json);
      expect(serializedJson).not.toContain(SECRET);

      const summary = renderStepSummary(outcome.json);
      expect(summary).not.toContain(SECRET);
    } finally {
      await repo.cleanup();
    }
  });

  it("threads cwd and targetPath through to the underlying diff engine", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("apps/web/CLAUDE.md", CLAUDE_CONTENT);
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("README.md", "noop\n");
      const candidate = await repo.commitAll("candidate: unrelated change");

      const outcome = await runAction({
        repository: repo.root,
        baseline,
        candidate,
        cwd: "apps/web",
        targetPath: "apps/web/src/page.tsx",
      });

      expect(outcome.status === "success" || outcome.status === "regressions").toBe(true);
      if (outcome.status === "error") throw new Error("unreachable");
      expect(outcome.json.context.cwd).toBe("apps/web");
      expect(outcome.json.context.targetPath).toBe("apps/web/src/page.tsx");
    } finally {
      await repo.cleanup();
    }
  });
});

describe("enrichAnalysisErrorMessage", () => {
  it("appends fetch-depth guidance for an unresolvable-revision error", () => {
    const enriched = enrichAnalysisErrorMessage(
      'Error: could not resolve baseline revision "origin/main"',
    );
    expect(enriched).toContain("fetch-depth: 0");
  });

  it("leaves unrelated error messages unchanged", () => {
    const message = "Error: repository is not a Git working tree: /some/path";
    expect(enrichAnalysisErrorMessage(message)).toBe(message);
  });
});
