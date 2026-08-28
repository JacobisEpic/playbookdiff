import path from "node:path";
import { describe, expect, it } from "vitest";
import { IdRegistry } from "./diagnostics.js";
import { validateAnalysisContext } from "./paths.js";
import { discoverRules } from "./rules.js";
import { loadClaudeMdExcludes } from "./settings.js";

const fixturesRoot = path.join(import.meta.dirname, "..", "test", "fixtures", "rules");

async function discover(params: { repositoryRoot: string; targetPath?: string }) {
  const ctx = await validateAnalysisContext({
    repositoryRoot: params.repositoryRoot,
    cwd: params.repositoryRoot,
    mode: "repo",
    ...(params.targetPath !== undefined ? { targetPath: params.targetPath } : {}),
  });
  const registry = new IdRegistry();
  const excludes = await loadClaudeMdExcludes(ctx.cwd, registry);
  return discoverRules(ctx, excludes, registry);
}

describe("unconditional rules", () => {
  it("loads a rule with no paths frontmatter at startup", async () => {
    const result = await discover({ repositoryRoot: path.join(fixturesRoot, "unconditional") });
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0]?.loadPhase).toBe("startup");
    expect(result.instructions[0]?.content).toContain("2-space indentation");
    expect(result.instructions[0]?.source.path).toBe(".claude/rules/style.md");
  });
});

describe("path-scoped rules", () => {
  it("includes a path-scoped rule as on-demand when targetPath matches", async () => {
    const root = path.join(fixturesRoot, "path-scoped");
    const result = await discover({ repositoryRoot: root, targetPath: "src/api/users.ts" });
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0]?.loadPhase).toBe("on-demand");
    expect(result.instructions[0]?.scope.appliesTo).toEqual(["src/api/**/*.ts"]);
  });

  it("omits a path-scoped rule when targetPath does not match", async () => {
    const root = path.join(fixturesRoot, "path-scoped");
    const result = await discover({ repositoryRoot: root, targetPath: "docs/readme.md" });
    expect(result.instructions).toHaveLength(0);
  });

  it("leaves a path-scoped rule conditional and diagnosed without a targetPath", async () => {
    const result = await discover({
      repositoryRoot: path.join(fixturesRoot, "no-target-conditional"),
    });
    expect(result.instructions).toHaveLength(0);
    const diagnostic = result.diagnostics.find((d) => d.code === "assumption");
    expect(diagnostic).toBeDefined();
  });
});

describe("claudeMdExcludes for rules", () => {
  it("excludes a matched rule file with provenance", async () => {
    const result = await discover({ repositoryRoot: path.join(fixturesRoot, "excluded") });
    expect(result.instructions).toHaveLength(0);
    const diagnostic = result.diagnostics.find((d) =>
      d.message.includes("Excluded by claudeMdExcludes"),
    );
    expect(diagnostic).toBeDefined();
  });
});

describe("separately nested .claude/rules/ root", () => {
  it("surfaces an unresolved diagnostic instead of silently discovering or ignoring it", async () => {
    const root = path.join(fixturesRoot, "nested-independent-root");
    const result = await discover({ repositoryRoot: root, targetPath: "apps/api/file.ts" });
    expect(result.instructions).toHaveLength(0);
    const diagnostic = result.diagnostics.find((d) => d.code === "unresolved");
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.message).toContain("apps/api/.claude/rules");
  });
});
