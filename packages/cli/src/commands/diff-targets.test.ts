import { describe, expect, it } from "vitest";
import { EXIT_ACTIONABLE_FINDINGS, EXIT_SUCCESS } from "../exit-codes.js";
import type { DiffJsonOutput } from "../format/diff-json.js";
import { createTestGitRepo, type TestGitRepo } from "../git/test-repo.js";
import { runDiff } from "./diff.js";

const SHARED = "Run the project tests before committing.\n";
const NESTED_CLAUDE = "# Server\n\nUse the server package conventions.\n";

/**
 * Runs the Action's default configuration: no explicit target, contexts derived
 * from what the revision pair changed.
 */
async function diffAuto(
  repo: TestGitRepo,
  baseline: string,
  candidate: string,
  overrides: { cwd?: string; targetPath?: string } = {},
): Promise<{ exitCode: number; json: DiffJsonOutput }> {
  const outcome = await runDiff({
    repository: repo.root,
    range: `${baseline}..${candidate}`,
    cwd: overrides.cwd ?? ".",
    ...(overrides.targetPath !== undefined ? { targetPath: overrides.targetPath } : {}),
    deriveTargets: true,
    json: true,
  });
  return { exitCode: outcome.exitCode, json: JSON.parse(outcome.stdout ?? "{}") as DiffJsonOutput };
}

/** A repository whose root configuration is already mirrored, so only nested changes can move the result. */
async function repoWithMirroredRoot(): Promise<TestGitRepo> {
  const repo = await createTestGitRepo();
  await repo.writeFile("CLAUDE.md", SHARED);
  await repo.writeFile("AGENTS.md", SHARED);
  await repo.writeFile("server/routes.go", "package server\n");
  return repo;
}

function skill(name: string): string {
  return `---\nname: ${name}\ndescription: ${name} skill.\n---\n\n${name} body.\n`;
}

describe("automatic target derivation", () => {
  it("detects a nested Claude-only instruction added with no explicit path", async () => {
    // The exact failure this feature exists to fix: before derivation, this
    // pull request passed CI because the repository root sees neither harness
    // receive the nested file.
    const repo = await repoWithMirroredRoot();
    try {
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("server/CLAUDE.md", NESTED_CLAUDE);
      const candidate = await repo.commitAll("candidate: nested Claude-only instruction");

      const { exitCode, json } = await diffAuto(repo, baseline, candidate);
      expect(exitCode).toBe(EXIT_ACTIONABLE_FINDINGS);
      expect(json.diff.summary.introducedActionable).toBe(1);
      expect(json.analyzed.derived).toBe(true);
      expect(json.analyzed.targets.map((target) => target.path)).toContain("server");
    } finally {
      await repo.cleanup();
    }
  });

  it("still detects a root-only regression", async () => {
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", SHARED);
      await repo.writeFile("AGENTS.md", SHARED);
      const baseline = await repo.commitAll("baseline: parity");
      await repo.removeFile("AGENTS.md");
      const candidate = await repo.commitAll("candidate: drop AGENTS.md");

      const { exitCode, json } = await diffAuto(repo, baseline, candidate);
      expect(exitCode).toBe(EXIT_ACTIONABLE_FINDINGS);
      expect(json.diff.summary.introducedActionable).toBe(1);
    } finally {
      await repo.cleanup();
    }
  });

  it("reports no regression for a nested Codex-only instruction, which no root session receives", async () => {
    // Codex builds its project chain through the launch directory only, so at
    // cwd "." a nested AGENTS.md reaches neither harness. Reporting a
    // regression here would fabricate a session that cannot occur.
    const repo = await repoWithMirroredRoot();
    try {
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("server/AGENTS.md", "# Server\n\nCodex-only server notes.\n");
      const candidate = await repo.commitAll("candidate: nested Codex-only instruction");

      const { exitCode, json } = await diffAuto(repo, baseline, candidate);
      expect(exitCode).toBe(EXIT_SUCCESS);
      expect(json.diff.summary.introducedActionable).toBe(0);
    } finally {
      await repo.cleanup();
    }
  });

  it("keeps mirrored nested configuration bound to the launch directory it is mirrored for", async () => {
    // Adding `server/AGENTS.md` beside `server/CLAUDE.md` does not make the two
    // harnesses equivalent for a session launched at the repository root:
    // Codex builds its project chain through the launch directory only and
    // never descends into `server`, while Claude Code reaches the nested file
    // on demand. That gap is real at cwd ".", and closes at cwd "server" -
    // which is the distinction between a launch directory and a work target,
    // and exactly what derivation must not paper over.
    const repo = await repoWithMirroredRoot();
    try {
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("server/CLAUDE.md", NESTED_CLAUDE);
      await repo.writeFile("server/AGENTS.md", NESTED_CLAUDE);
      const candidate = await repo.commitAll("candidate: mirrored nested config");

      const fromRoot = await diffAuto(repo, baseline, candidate);
      expect(fromRoot.exitCode).toBe(EXIT_ACTIONABLE_FINDINGS);
      expect(fromRoot.json.diff.summary.introducedActionable).toBe(1);

      const fromServer = await diffAuto(repo, baseline, candidate, { cwd: "server" });
      expect(fromServer.exitCode).toBe(EXIT_SUCCESS);
      expect(fromServer.json.diff.introduced).toEqual([]);
    } finally {
      await repo.cleanup();
    }
  });

  it("reports a resolution when nested Claude-only configuration is deleted", async () => {
    const repo = await repoWithMirroredRoot();
    try {
      await repo.writeFile("server/CLAUDE.md", NESTED_CLAUDE);
      const baseline = await repo.commitAll("baseline: nested Claude-only instruction");
      await repo.removeFile("server/CLAUDE.md");
      const candidate = await repo.commitAll("candidate: delete it");

      const { exitCode, json } = await diffAuto(repo, baseline, candidate);
      expect(exitCode).toBe(EXIT_SUCCESS);
      expect(json.diff.summary.resolved).toBe(1);
      expect(json.diff.summary.introduced).toBe(0);
    } finally {
      await repo.cleanup();
    }
  });

  it("analyzes the scope of a changed source file beneath existing nested configuration", async () => {
    // Nothing about the configuration changed here, so this must not fail;
    // what matters is that the nested scope was actually looked at, and that
    // the pre-existing gap is reported as debt rather than as new.
    const repo = await repoWithMirroredRoot();
    try {
      await repo.writeFile("server/CLAUDE.md", NESTED_CLAUDE);
      const baseline = await repo.commitAll("baseline: nested Claude-only instruction");
      await repo.writeFile("server/routes.go", "package server\n\nfunc Route() {}\n");
      const candidate = await repo.commitAll("candidate: edit source under it");

      const { exitCode, json } = await diffAuto(repo, baseline, candidate);
      expect(exitCode).toBe(EXIT_SUCCESS);
      expect(json.diff.summary.introducedActionable).toBe(0);
      expect(json.diff.summary.unchanged).toBeGreaterThan(0);
      expect(json.analyzed.targets.map((target) => target.path)).toContain("server/routes.go");
    } finally {
      await repo.cleanup();
    }
  });

  it("detects a changed path-scoped rule through a file that rule governs", async () => {
    const repo = await repoWithMirroredRoot();
    try {
      await repo.writeFile("server/routes_test.go", "package server\n");
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile(
        ".claude/rules/testing.md",
        '---\npaths:\n  - "**/*_test.go"\n---\n\nName test cases after the behavior they prove.\n',
      );
      const candidate = await repo.commitAll("candidate: add a path-scoped rule");

      const { exitCode, json } = await diffAuto(repo, baseline, candidate);
      expect(exitCode).toBe(EXIT_ACTIONABLE_FINDINGS);
      expect(json.diff.summary.introducedActionable).toBe(1);
      expect(json.analyzed.targets.map((target) => target.path)).toContain("server/routes_test.go");
    } finally {
      await repo.cleanup();
    }
  });

  it("does not activate a path-scoped rule the repository has no matching file for", async () => {
    const repo = await repoWithMirroredRoot();
    try {
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile(
        ".claude/rules/rust.md",
        '---\npaths:\n  - "**/*.rs"\n---\n\nPrefer explicit lifetimes.\n',
      );
      const candidate = await repo.commitAll("candidate: rule for a language not in this repo");

      const { exitCode, json } = await diffAuto(repo, baseline, candidate);
      expect(exitCode).toBe(EXIT_SUCCESS);
      expect(json.diff.summary.introducedActionable).toBe(0);
    } finally {
      await repo.cleanup();
    }
  });

  it("reports one regression, not many, when a finding is reachable from several contexts", async () => {
    // Nested configuration is reached from every changed file beneath it. The
    // finding has one stable ID, so it must be counted once.
    const repo = await repoWithMirroredRoot();
    try {
      for (let index = 0; index < 12; index += 1) {
        await repo.writeFile(`server/file${index}.go`, "package server\n");
      }
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("server/CLAUDE.md", NESTED_CLAUDE);
      for (let index = 0; index < 12; index += 1) {
        await repo.writeFile(`server/file${index}.go`, `package server // ${index}\n`);
      }
      const candidate = await repo.commitAll("candidate: nested config plus many edits");

      const { exitCode, json } = await diffAuto(repo, baseline, candidate);
      expect(exitCode).toBe(EXIT_ACTIONABLE_FINDINGS);
      expect(json.diff.summary.introducedActionable).toBe(1);
      expect(new Set(json.diff.introduced.map((finding) => finding.id)).size).toBe(
        json.diff.introduced.length,
      );
    } finally {
      await repo.cleanup();
    }
  });

  it("represents several distinct scopes in one run", async () => {
    const repo = await repoWithMirroredRoot();
    try {
      await repo.writeFile("web/page.tsx", "export default null\n");
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("server/CLAUDE.md", NESTED_CLAUDE);
      await repo.writeFile("web/CLAUDE.md", "# Web\n\nUse the web package conventions.\n");
      const candidate = await repo.commitAll("candidate: two nested scopes");

      const { exitCode, json } = await diffAuto(repo, baseline, candidate);
      expect(exitCode).toBe(EXIT_ACTIONABLE_FINDINGS);
      expect(json.diff.summary.introducedActionable).toBe(2);
      const analyzed = json.analyzed.targets.map((target) => target.path);
      expect(analyzed).toContain("server");
      expect(analyzed).toContain("web");
    } finally {
      await repo.cleanup();
    }
  });

  it("does not report a rename of nested configuration as both a regression and a resolution twice", async () => {
    const repo = await repoWithMirroredRoot();
    try {
      await repo.writeFile("server/CLAUDE.md", NESTED_CLAUDE);
      const baseline = await repo.commitAll("baseline: nested config under server");
      await repo.removeFile("server/CLAUDE.md");
      await repo.writeFile("service/CLAUDE.md", NESTED_CLAUDE);
      await repo.writeFile("service/routes.go", "package service\n");
      const candidate = await repo.commitAll("candidate: move it to service");

      const { json } = await diffAuto(repo, baseline, candidate);
      expect(json.diff.summary.introducedActionable).toBe(1);
      expect(json.diff.summary.resolved).toBe(1);
      expect(new Set(json.diff.introduced.map((finding) => finding.id)).size).toBe(1);
      expect(new Set(json.diff.resolved.map((finding) => finding.id)).size).toBe(1);
    } finally {
      await repo.cleanup();
    }
  });

  it("never turns pre-existing debt into a regression, even when a new context also reaches it", async () => {
    // The root gap exists at both revisions. Analyzing more contexts in the
    // candidate must not make an old finding look new.
    const repo = await createTestGitRepo();
    try {
      await repo.writeFile("CLAUDE.md", SHARED);
      await repo.writeFile(".claude/skills/deploy/SKILL.md", skill("deploy"));
      await repo.writeFile("server/routes.go", "package server\n");
      const baseline = await repo.commitAll("baseline: existing Claude-only debt");
      await repo.writeFile("server/routes.go", "package server\n\nfunc Route() {}\n");
      const candidate = await repo.commitAll("candidate: unrelated source edit");

      const { exitCode, json } = await diffAuto(repo, baseline, candidate);
      expect(exitCode).toBe(EXIT_SUCCESS);
      expect(json.diff.introduced).toEqual([]);
      expect(json.diff.summary.unchanged).toBeGreaterThan(0);
    } finally {
      await repo.cleanup();
    }
  });

  it("stays at exit 0 when the only new finding is informational", async () => {
    const repo = await repoWithMirroredRoot();
    try {
      const baseline = await repo.commitAll("baseline: identical root prose");
      await repo.writeFile("AGENTS.md", "Make sure the test suite passes before you push.\n");
      const candidate = await repo.commitAll("candidate: reword one side");

      const { exitCode, json } = await diffAuto(repo, baseline, candidate);
      expect(exitCode).toBe(EXIT_SUCCESS);
      expect(json.diff.summary.introducedActionable).toBe(0);
      expect(json.diff.summary.introducedInformational).toBeGreaterThan(0);
    } finally {
      await repo.cleanup();
    }
  });

  it("analyzes exactly the requested context when an explicit path is given", async () => {
    // Explicit intent stays predictable: the caller named one context, so no
    // derived context is silently added alongside it.
    const repo = await repoWithMirroredRoot();
    try {
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("server/CLAUDE.md", NESTED_CLAUDE);
      await repo.writeFile("web/CLAUDE.md", "# Web\n\nUse the web package conventions.\n");
      const candidate = await repo.commitAll("candidate: two nested scopes");

      const { json } = await diffAuto(repo, baseline, candidate, {
        targetPath: "server/routes.go",
      });
      expect(json.analyzed.derived).toBe(false);
      expect(json.analyzed.targets).toHaveLength(1);
      expect(json.diff.summary.introducedActionable).toBe(1);
    } finally {
      await repo.cleanup();
    }
  });

  it("produces byte-identical output across repeated runs of the same revision pair", async () => {
    const repo = await repoWithMirroredRoot();
    try {
      await repo.writeFile("web/page.tsx", "export default null\n");
      const baseline = await repo.commitAll("baseline");
      await repo.writeFile("server/CLAUDE.md", NESTED_CLAUDE);
      await repo.writeFile("web/CLAUDE.md", "# Web\n\nUse the web package conventions.\n");
      const candidate = await repo.commitAll("candidate");

      const first = await runDiff({
        repository: repo.root,
        range: `${baseline}..${candidate}`,
        cwd: ".",
        deriveTargets: true,
        json: true,
      });
      const second = await runDiff({
        repository: repo.root,
        range: `${baseline}..${candidate}`,
        cwd: ".",
        deriveTargets: true,
        json: true,
      });
      expect(first.stdout).toBe(second.stdout);
    } finally {
      await repo.cleanup();
    }
  });

  it("handles a scope that exists at only one revision", async () => {
    const repo = await repoWithMirroredRoot();
    try {
      const baseline = await repo.commitAll("baseline: no such directory yet");
      await repo.writeFile("brand-new/deep/CLAUDE.md", NESTED_CLAUDE);
      await repo.writeFile("brand-new/deep/main.go", "package deep\n");
      const candidate = await repo.commitAll("candidate: whole new directory");

      const { exitCode, json } = await diffAuto(repo, baseline, candidate);
      expect(exitCode).toBe(EXIT_ACTIONABLE_FINDINGS);
      expect(json.diff.summary.introducedActionable).toBe(1);
    } finally {
      await repo.cleanup();
    }
  });
});
