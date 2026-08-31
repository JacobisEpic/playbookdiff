import path from "node:path";
import { describe, expect, it } from "vitest";
import { IdRegistry } from "./diagnostics.js";
import { discoverInstructions } from "./instructions.js";
import { validateAnalysisContext } from "./paths.js";
import { loadClaudeMdExcludes } from "./settings.js";

const fixturesRoot = path.join(import.meta.dirname, "..", "test", "fixtures");

async function discover(params: {
  repositoryRoot: string;
  cwd?: string;
  targetPath?: string;
  mode?: "repo" | "local";
}) {
  const ctx = await validateAnalysisContext({
    repositoryRoot: params.repositoryRoot,
    cwd: params.cwd ?? params.repositoryRoot,
    mode: params.mode ?? "repo",
    ...(params.targetPath !== undefined ? { targetPath: params.targetPath } : {}),
  });
  const registry = new IdRegistry();
  const excludes = await loadClaudeMdExcludes(ctx.cwd, registry);
  return discoverInstructions(ctx, excludes, registry);
}

describe("ancestor startup discovery", () => {
  it("loads a root-only CLAUDE.md at startup", async () => {
    const root = path.join(fixturesRoot, "instructions", "root-only");
    const result = await discover({ repositoryRoot: root });
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0]?.content).toContain("Always run the test suite");
    expect(result.instructions[0]?.source.path).toBe("CLAUDE.md");
    expect(result.instructions[0]?.loadPhase).toBe("startup");
  });

  it("loads a .claude/CLAUDE.md-only project file", async () => {
    const root = path.join(fixturesRoot, "instructions", "dot-claude-only");
    const result = await discover({ repositoryRoot: root });
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0]?.source.path).toBe(".claude/CLAUDE.md");
  });

  it("loads both CLAUDE.md and .claude/CLAUDE.md when they coexist, root first", async () => {
    // Empirically verified: an isolated fixture with both files, probed via
    // the InstructionsLoaded hook (load_reason: session_start), fired for
    // CLAUDE.md and then .claude/CLAUDE.md - both load, not one-wins.
    const root = path.join(fixturesRoot, "instructions", "coexist");
    const result = await discover({ repositoryRoot: root });
    expect(result.instructions).toHaveLength(2);
    expect(result.instructions[0]?.source.path).toBe("CLAUDE.md");
    expect(result.instructions[0]?.content).toContain("MARKER-COEXIST-ROOT");
    expect(result.instructions[1]?.source.path).toBe(".claude/CLAUDE.md");
    expect(result.instructions[1]?.content).toContain("MARKER-COEXIST-DOTCLAUDE");
    expect(result.instructions[0]?.order ?? -1).toBeLessThan(result.instructions[1]?.order ?? -1);
  });

  it("does not treat AGENTS.md as a native Claude instruction source", async () => {
    const root = path.join(fixturesRoot, "instructions", "root-only");
    const result = await discover({ repositoryRoot: root });
    expect(result.instructions.every((i) => i.source.path !== "AGENTS.md")).toBe(true);
  });
});

describe("nested on-demand discovery", () => {
  it("marks a descendant CLAUDE.md on-demand only when targetPath reaches it", async () => {
    const root = path.join(fixturesRoot, "instructions", "nested");
    const result = await discover({ repositoryRoot: root, targetPath: "apps/api/file.ts" });
    expect(result.instructions).toHaveLength(2);
    const rootInstr = result.instructions.find((i) => i.source.path === "CLAUDE.md");
    const nestedInstr = result.instructions.find((i) => i.source.path === "apps/api/CLAUDE.md");
    expect(rootInstr?.loadPhase).toBe("startup");
    expect(nestedInstr?.loadPhase).toBe("on-demand");
  });

  it("leaves a descendant CLAUDE.md undiscovered without a targetPath", async () => {
    const root = path.join(fixturesRoot, "instructions", "nested");
    const result = await discover({ repositoryRoot: root });
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0]?.source.path).toBe("CLAUDE.md");
  });
});

describe("CLAUDE.local.md handling", () => {
  it("reports applicability repository-relative, independent of the launch cwd", async () => {
    // Applicability is a property of where the instruction file lives, not of
    // where the agent happened to start. Reporting a nested CLAUDE.md as
    // repository-wide previously made a mirrored nested Codex file look like a
    // scope gap purely because the two adapters used different coordinates.
    const root = path.join(fixturesRoot, "instructions", "nested");
    const fromRoot = await discover({
      repositoryRoot: root,
      targetPath: path.join(root, "apps", "api", "file.ts"),
    });
    expect(
      fromRoot.instructions.map((instruction) => [
        instruction.source.path,
        instruction.scope.appliesTo,
        instruction.loadPhase,
      ]),
    ).toEqual([
      ["CLAUDE.md", ["."], "startup"],
      ["apps/api/CLAUDE.md", ["apps/api"], "on-demand"],
    ]);

    const fromNested = await discover({
      repositoryRoot: root,
      cwd: path.join(root, "apps", "api"),
    });
    expect(
      fromNested.instructions.map((instruction) => [
        instruction.source.path,
        instruction.scope.appliesTo,
        instruction.loadPhase,
      ]),
    ).toEqual([
      ["CLAUDE.md", ["."], "startup"],
      ["apps/api/CLAUDE.md", ["apps/api"], "startup"],
    ]);
  });

  it("gives imported content the importing file's applicability, not the imported file's location", async () => {
    const root = path.join(fixturesRoot, "instructions", "nested-import");
    const result = await discover({
      repositoryRoot: root,
      cwd: path.join(root, "apps", "api"),
    });
    const imported = result.instructions.find(
      (instruction) => instruction.source.path === "shared/rules.md",
    );
    expect(imported).toBeDefined();
    expect(imported?.scope.appliesTo).toEqual(["apps/api"]);
  });

  it("excludes CLAUDE.local.md from repo-mode output with a diagnostic", async () => {
    const root = path.join(fixturesRoot, "instructions", "claude-local");
    const result = await discover({ repositoryRoot: root, mode: "repo" });
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0]?.source.path).toBe("CLAUDE.md");
    const diagnostic = result.diagnostics.find((d) => d.code === "local-config-unavailable");
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.source?.path).toBe("CLAUDE.local.md");
  });

  it("includes CLAUDE.local.md with local scope in local mode", async () => {
    const root = path.join(fixturesRoot, "instructions", "claude-local");
    const result = await discover({ repositoryRoot: root, mode: "local" });
    expect(result.instructions).toHaveLength(2);
    const local = result.instructions.find((i) => i.source.path === "CLAUDE.local.md");
    expect(local?.source.scope).toBe("local");
  });
});

describe("claudeMdExcludes", () => {
  it("excludes a matched CLAUDE.md and records provenance for the exclusion", async () => {
    const root = path.join(fixturesRoot, "instructions", "excluded");
    const result = await discover({ repositoryRoot: root });
    expect(result.instructions).toHaveLength(0);
    const diagnostic = result.diagnostics.find((d) =>
      d.message.includes("Excluded by claudeMdExcludes"),
    );
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.source?.path).toBe("CLAUDE.md");
  });
});

describe("imports", () => {
  it("splits an importing file into segments around the import, in effective order", async () => {
    const root = path.join(fixturesRoot, "imports", "basic");
    const result = await discover({ repositoryRoot: root });
    expect(result.instructions.map((i) => [i.source.path, i.content])).toEqual([
      ["CLAUDE.md", "# Basic import\n\nSee "],
      ["shared.md", "Shared conventions live here.\n"],
      ["CLAUDE.md", " for shared conventions.\n"],
    ]);
    const orders = result.instructions.map((i) => i.order ?? -1);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("preserves effective order for imports appearing mid-document", async () => {
    const root = path.join(fixturesRoot, "imports", "inline-multi");
    const result = await discover({ repositoryRoot: root });
    expect(result.instructions.map((i) => [i.source.path, i.content])).toEqual([
      ["CLAUDE.md", "Do A.\n\nSee "],
      ["a.md", "Content of A.\n"],
      ["CLAUDE.md", " and "],
      ["b.md", "Content of B.\n"],
      ["CLAUDE.md", " for details.\n\nDo B.\n"],
    ]);
    const orders = result.instructions.map((i) => i.order ?? -1);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("assigns unique effective ids when the same file is imported more than once", async () => {
    const root = path.join(fixturesRoot, "imports", "repeated");
    const result = await discover({ repositoryRoot: root });
    const imported = result.instructions.filter(
      (instruction) => instruction.source.path === "shared.md",
    );
    expect(imported).toHaveLength(2);
    expect(new Set(imported.map((instruction) => instruction.id))).toHaveLength(2);
    expect(new Set(result.provenance.map((record) => record.effectiveId)).size).toBe(
      result.provenance.length,
    );
  });

  it("follows a recursive import chain within the documented depth", async () => {
    const root = path.join(fixturesRoot, "imports", "recursive");
    const result = await discover({ repositoryRoot: root });
    expect(result.instructions.map((i) => i.source.path)).toEqual(["CLAUDE.md", "a.md", "b.md"]);
  });

  it("ignores import syntax inside inline code and fenced code blocks", async () => {
    const root = path.join(fixturesRoot, "imports", "code-ignored");
    const result = await discover({ repositoryRoot: root });
    const paths = result.instructions.map((i) => i.source.path);
    expect(paths).not.toContain("shared.md");
    expect(paths).toContain("real.md");
  });

  it("emits an unresolved diagnostic for a missing import target", async () => {
    const root = path.join(fixturesRoot, "imports", "unresolved");
    const result = await discover({ repositoryRoot: root });
    expect(result.instructions).toHaveLength(1);
    const diagnostic = result.diagnostics.find((d) => d.code === "unresolved");
    expect(diagnostic).toBeDefined();
    // An import that resolves to nothing contributes no content, so the text it
    // was written in still reads exactly as the file does.
    expect(result.instructions[0]?.content).toContain("@missing.md");
  });

  it("keeps a file contiguous when an unresolved import-looking token sits mid-prose", async () => {
    // A scoped package name in a heading looks like `@path` import syntax but
    // resolves to nothing. It must not split the file, drop its own text, or
    // manufacture a second instruction - all of which would break exact-content
    // matching against an identical file on the other harness.
    const root = path.join(fixturesRoot, "imports", "unresolved-inline");
    const result = await discover({ repositoryRoot: root });
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0]?.content).toBe(
      "# @scope/package conventions\n\nRun the project tests before committing.\n\nUse the API package conventions.\n",
    );
    expect(result.diagnostics.find((d) => d.code === "unresolved")).toBeDefined();
  });

  it("does not follow an import that resolves outside the repository", async () => {
    const root = path.join(fixturesRoot, "imports", "outside-repo", "repo");
    const result = await discover({ repositoryRoot: root });
    expect(result.instructions).toHaveLength(1);
    const diagnostic = result.diagnostics.find((d) => d.code === "outside-repository");
    expect(diagnostic).toBeDefined();
  });

  it("terminates an import cycle with a diagnostic instead of recursing forever", async () => {
    const root = path.join(fixturesRoot, "imports", "cycle");
    const result = await discover({ repositoryRoot: root });
    expect(result.instructions.map((i) => i.source.path)).toEqual(["CLAUDE.md", "a.md"]);
    const diagnostic = result.diagnostics.find((d) => d.message.includes("cycle"));
    expect(diagnostic).toBeDefined();
  });
});
