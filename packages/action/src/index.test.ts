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
});
