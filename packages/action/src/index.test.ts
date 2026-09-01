import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createTestGitRepo } from "./test-repo.js";

const bundlePath = path.join(import.meta.dirname, "..", "dist", "index.mjs");

/**
 * Parses the `GITHUB_OUTPUT` file format `@actions/core.setOutput` writes:
 * `name<<DELIMITER\nvalue\nDELIMITER\n` per output, one block after another.
 */
function parseGithubOutputFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split("\n");
  let index = 0;
  while (index < lines.length) {
    const header = lines[index] ?? "";
    const separatorIndex = header.indexOf("<<");
    if (separatorIndex === -1) {
      index += 1;
      continue;
    }
    const name = header.slice(0, separatorIndex);
    const delimiter = header.slice(separatorIndex + 2);
    const valueLines: string[] = [];
    index += 1;
    while (index < lines.length && lines[index] !== delimiter) {
      valueLines.push(lines[index] ?? "");
      index += 1;
    }
    result[name] = valueLines.join("\n");
    index += 1;
  }
  return result;
}

async function runBundle(env: Record<string, string | undefined>): Promise<{
  status: number | null;
  stdout: string;
  stderr: string;
  outputs: Record<string, string>;
  summary: string;
}> {
  const outputFile = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "pd-gh-output-")), "output");
  const summaryFile = path.join(
    await fs.mkdtemp(path.join(os.tmpdir(), "pd-gh-summary-")),
    "summary",
  );
  await fs.writeFile(outputFile, "", "utf8");
  await fs.writeFile(summaryFile, "", "utf8");

  const result = spawnSync(process.execPath, [bundlePath], {
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
      GITHUB_OUTPUT: outputFile,
      GITHUB_STEP_SUMMARY: summaryFile,
    },
  });

  const outputs = parseGithubOutputFile(await fs.readFile(outputFile, "utf8"));
  const summary = await fs.readFile(summaryFile, "utf8");
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, outputs, summary };
}

describe("bundled Action entry point (dist/index.mjs)", () => {
  it("boots, reads inputs, and reports success for a resolved-only diff", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("AGENTS.md", "Run tests before pushing.\n");
      const candidate = await repo.commitAll("candidate: resolve the gap");

      const { status, outputs, summary, stdout } = await runBundle({
        INPUT_BASELINE: baseline,
        INPUT_CANDIDATE: candidate,
        INPUT_CWD: ".",
        GITHUB_WORKSPACE: repo.root,
      });

      expect(status).toBe(0);
      expect(stdout).not.toContain("::error::");
      expect(outputs.result).toBe("no-new-regressions");
      expect(outputs["resolved-count"]).toBe("1");
      expect(outputs["baseline-sha"]).toBe(baseline);
      expect(outputs["candidate-sha"]).toBe(candidate);
      expect(summary).toContain("# PlaybookDiff");
      expect(summary).toContain("Resolved");
    } finally {
      await repo.cleanup();
    }
  });

  it("exits non-zero and marks new-regressions when a new actionable finding is introduced", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      await repo.writeFile("AGENTS.md", "Run tests before pushing.\n");
      const baseline = await repo.commitAll("baseline: parity");
      await repo.removeFile("AGENTS.md");
      const candidate = await repo.commitAll("candidate: drop AGENTS.md");

      const { status, outputs, stdout } = await runBundle({
        INPUT_BASELINE: baseline,
        INPUT_CANDIDATE: candidate,
        INPUT_CWD: ".",
        GITHUB_WORKSPACE: repo.root,
      });

      expect(status).not.toBe(0);
      expect(stdout).toContain("::error::");
      expect(stdout).toContain("new actionable");
      expect(outputs.result).toBe("new-regressions");
      expect(outputs["introduced-actionable-count"]).toBe("1");
    } finally {
      await repo.cleanup();
    }
  });

  it("fails distinctly, with no result output, when the baseline revision cannot be resolved", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      const candidate = await repo.commitAll("initial");

      const { status, outputs, stdout } = await runBundle({
        INPUT_BASELINE: "does-not-exist",
        INPUT_CANDIDATE: candidate,
        INPUT_CWD: ".",
        GITHUB_WORKSPACE: repo.root,
      });

      expect(status).not.toBe(0);
      expect(stdout).toContain("could not resolve baseline revision");
      expect(stdout).toContain("fetch-depth: 0");
      expect(outputs.result).toBeUndefined();
    } finally {
      await repo.cleanup();
    }
  });

  it("fails distinctly when no baseline/candidate can be determined outside a pull_request event", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("a.txt", "a");
      await repo.commitAll("initial");

      const { status, stdout, outputs } = await runBundle({
        GITHUB_EVENT_NAME: "push",
        GITHUB_WORKSPACE: repo.root,
      });

      expect(status).not.toBe(0);
      expect(stdout).toContain("could not determine");
      expect(outputs.result).toBeUndefined();
    } finally {
      await repo.cleanup();
    }
  });

  it("derives baseline/candidate automatically from a pull_request event payload", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("README.md", "noop\n");
      const candidate = await repo.commitAll("candidate: unrelated change");

      const eventDir = await fs.mkdtemp(path.join(os.tmpdir(), "pd-event-"));
      const eventPath = path.join(eventDir, "event.json");
      await fs.writeFile(
        eventPath,
        JSON.stringify({ pull_request: { base: { sha: baseline }, head: { sha: candidate } } }),
        "utf8",
      );

      const { status, outputs } = await runBundle({
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_WORKSPACE: repo.root,
      });

      expect(status).toBe(0);
      expect(outputs["baseline-sha"]).toBe(baseline);
      expect(outputs["candidate-sha"]).toBe(candidate);
    } finally {
      await repo.cleanup();
    }
  });

  it("never leaks a host temporary worktree path into the summary or outputs", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("AGENTS.md", "Run tests before pushing.\n");
      const candidate = await repo.commitAll("candidate");

      const { summary, outputs } = await runBundle({
        INPUT_BASELINE: baseline,
        INPUT_CANDIDATE: candidate,
        INPUT_CWD: ".",
        GITHUB_WORKSPACE: repo.root,
      });

      expect(summary).not.toContain("/snapshot");
      expect(summary).not.toMatch(/playbookdiff-(baseline|candidate)-/);
      expect(JSON.stringify(outputs)).not.toContain("/snapshot");
    } finally {
      await repo.cleanup();
    }
  });

  it("catches a nested Claude-only regression with no path input at all", async () => {
    // The default workflow: `uses:` and nothing else. Before contexts were
    // derived from changed paths, this pull request passed CI.
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      await repo.writeFile("AGENTS.md", "Run tests before pushing.\n");
      await repo.writeFile("server/routes.go", "package server\n");
      const baseline = await repo.commitAll("baseline: mirrored root");
      await repo.writeFile("server/CLAUDE.md", "# Server\n\nUse the server conventions.\n");
      const candidate = await repo.commitAll("candidate: nested Claude-only instruction");

      const { status, outputs, summary } = await runBundle({
        INPUT_BASELINE: baseline,
        INPUT_CANDIDATE: candidate,
        GITHUB_WORKSPACE: repo.root,
      });

      expect(status).not.toBe(0);
      expect(outputs.result).toBe("new-regressions");
      expect(outputs["introduced-actionable-count"]).toBe("1");
      expect(Number(outputs["analyzed-target-count"])).toBeGreaterThan(1);
      expect(summary).toContain("changed scope");
    } finally {
      await repo.cleanup();
    }
  });

  it("counts a regression once when many changed files reach the same nested configuration", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      await repo.writeFile("AGENTS.md", "Run tests before pushing.\n");
      for (let index = 0; index < 25; index += 1) {
        await repo.writeFile(`server/file${index}.go`, "package server\n");
      }
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("server/CLAUDE.md", "# Server\n\nUse the server conventions.\n");
      for (let index = 0; index < 25; index += 1) {
        await repo.writeFile(`server/file${index}.go`, `package server // ${index}\n`);
      }
      const candidate = await repo.commitAll("candidate: config plus many edits");

      const { outputs } = await runBundle({
        INPUT_BASELINE: baseline,
        INPUT_CANDIDATE: candidate,
        GITHUB_WORKSPACE: repo.root,
      });

      expect(outputs["introduced-actionable-count"]).toBe("1");
      // One scope, so the 25 edits collapse: the startup context plus it.
      expect(outputs["analyzed-target-count"]).toBe("2");
    } finally {
      await repo.cleanup();
    }
  });

  it("does not fail on pre-existing debt that a newly analyzed context also reaches", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      await repo.writeFile("server/CLAUDE.md", "# Server\n\nUse the server conventions.\n");
      await repo.writeFile("server/routes.go", "package server\n");
      const baseline = await repo.commitAll("baseline: existing nested debt");
      await repo.writeFile("server/routes.go", "package server\n\nfunc Route() {}\n");
      const candidate = await repo.commitAll("candidate: touch source under it");

      const { status, outputs } = await runBundle({
        INPUT_BASELINE: baseline,
        INPUT_CANDIDATE: candidate,
        GITHUB_WORKSPACE: repo.root,
      });

      expect(status).toBe(0);
      expect(outputs.result).toBe("no-new-regressions");
      expect(outputs["introduced-actionable-count"]).toBe("0");
      expect(Number(outputs["unchanged-count"])).toBeGreaterThan(0);
    } finally {
      await repo.cleanup();
    }
  });

  it("analyzes only the requested context when a path input is given", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      await repo.writeFile("AGENTS.md", "Run tests before pushing.\n");
      await repo.writeFile("server/routes.go", "package server\n");
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("server/CLAUDE.md", "# Server\n\nUse the server conventions.\n");
      await repo.writeFile("web/CLAUDE.md", "# Web\n\nUse the web conventions.\n");
      const candidate = await repo.commitAll("candidate: two nested scopes");

      const { outputs } = await runBundle({
        INPUT_BASELINE: baseline,
        INPUT_CANDIDATE: candidate,
        INPUT_PATH: "server/routes.go",
        GITHUB_WORKSPACE: repo.root,
      });

      expect(outputs["analyzed-target-count"]).toBe("1");
      expect(outputs["introduced-actionable-count"]).toBe("1");
    } finally {
      await repo.cleanup();
    }
  });

  it("needs no token, API access, or network to derive contexts", async () => {
    // Changed paths come from local Git object data only. Stripping every
    // GitHub token from the environment must not change the result.
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", "Run tests before pushing.\n");
      await repo.writeFile("AGENTS.md", "Run tests before pushing.\n");
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("server/CLAUDE.md", "# Server\n\nUse the server conventions.\n");
      const candidate = await repo.commitAll("candidate");

      const { outputs } = await runBundle({
        INPUT_BASELINE: baseline,
        INPUT_CANDIDATE: candidate,
        GITHUB_WORKSPACE: repo.root,
        GITHUB_TOKEN: undefined,
        INPUT_GITHUB_TOKEN: undefined,
        GITHUB_API_URL: undefined,
      });

      expect(outputs["introduced-actionable-count"]).toBe("1");
      expect(Number(outputs["analyzed-target-count"])).toBeGreaterThan(1);
    } finally {
      await repo.cleanup();
    }
  });
});
