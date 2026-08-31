import path from "node:path";
import { describe, expect, it } from "vitest";
import { IdRegistry } from "./diagnostics.js";
import { validateAnalysisContext } from "./paths.js";
import { discoverSkills } from "./skills.js";

const fixturesRoot = path.join(import.meta.dirname, "..", "test", "fixtures", "skills");

async function discover(params: { repositoryRoot: string; targetPath?: string }) {
  const ctx = await validateAnalysisContext({
    repositoryRoot: params.repositoryRoot,
    cwd: params.repositoryRoot,
    mode: "repo",
    ...(params.targetPath !== undefined ? { targetPath: params.targetPath } : {}),
  });
  const registry = new IdRegistry();
  return discoverSkills(ctx, registry);
}

describe("root skills", () => {
  it("discovers a root skill as available", async () => {
    const result = await discover({ repositoryRoot: path.join(fixturesRoot, "root") });
    expect(result.skills).toHaveLength(1);
    const skill = result.skills[0]!;
    expect(skill.name).toBe("review");
    expect(skill.description).toContain("Reviews the current diff");
    expect(skill.discovery.state).toBe("available");
    expect(skill.invocation).toEqual({ explicit: "allowed", implicit: "allowed" });
    expect(skill.advertisement.state).toBe("advertised");
  });

  it("does not apply instruction-only claudeMdExcludes patterns to skills", async () => {
    const root = path.join(fixturesRoot, "exclude-setting-does-not-apply");
    const result = await discover({ repositoryRoot: root });
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.name).toBe("review");
  });
});

describe("nested skills", () => {
  it("discovers a descendant skill as conditional only when targetPath reaches it", async () => {
    const root = path.join(fixturesRoot, "duplicate-name");
    const result = await discover({ repositoryRoot: root, targetPath: "apps/web/file.ts" });
    const nested = result.skills.find((s) => s.path === "apps/web/.claude/skills/deploy/SKILL.md");
    expect(nested?.discovery.state).toBe("conditional");
  });

  it("does not discover a descendant skill without a targetPath", async () => {
    const root = path.join(fixturesRoot, "duplicate-name");
    const result = await discover({ repositoryRoot: root });
    expect(result.skills.find((s) => s.path.startsWith("apps/web/"))).toBeUndefined();
  });
});

describe("duplicate root/nested skill names", () => {
  it("preserves both same-name variants separately and cross-references them", async () => {
    const root = path.join(fixturesRoot, "duplicate-name");
    const result = await discover({ repositoryRoot: root, targetPath: "apps/web/file.ts" });
    const variants = result.skills.filter((s) => s.name === "deploy");
    expect(variants).toHaveLength(2);
    for (const variant of variants) {
      const others = variants.filter((v) => v.id !== variant.id).map((v) => v.id);
      expect(variant.crossReferences).toEqual(others);
    }
    const diagnostic = result.diagnostics.find((d) => d.message.includes("shares its name"));
    expect(diagnostic).toBeDefined();
  });
});

describe("invocation control", () => {
  it("maps disable-model-invocation: true to blocked implicit invocation and a hidden advertisement", async () => {
    const root = path.join(fixturesRoot, "disable-model-invocation");
    const result = await discover({ repositoryRoot: root });
    const skill = result.skills[0]!;
    expect(skill.invocation).toEqual({ explicit: "allowed", implicit: "blocked" });
    expect(skill.advertisement.state).toBe("hidden");
  });

  it("maps user-invocable: false to blocked explicit invocation with the description still advertised", async () => {
    const root = path.join(fixturesRoot, "user-invocable-false");
    const result = await discover({ repositoryRoot: root });
    const skill = result.skills[0]!;
    expect(skill.invocation).toEqual({ explicit: "blocked", implicit: "allowed" });
    expect(skill.advertisement.state).toBe("advertised");
  });
});

describe("advertisement budget", () => {
  it("flags a skill whose description exceeds the documented per-skill cap as budget-risk", async () => {
    const root = path.join(fixturesRoot, "budget-risk");
    const result = await discover({ repositoryRoot: root });
    const skill = result.skills[0]!;
    expect(skill.advertisement.state).toBe("budget-risk");
    expect(skill.advertisement.descriptionLimitChars).toBe(1536);
    const diagnostic = result.diagnostics.find((d) => d.code === "budget-risk");
    expect(diagnostic).toBeDefined();
  });
});

describe("skill paths frontmatter", () => {
  it("resolves implicit invocation to allowed when targetPath matches", async () => {
    const root = path.join(fixturesRoot, "paths-scoped");
    const result = await discover({ repositoryRoot: root, targetPath: "src/api/users.ts" });
    const skill = result.skills[0]!;
    expect(skill.invocation.implicit).toBe("allowed");
  });

  it("resolves implicit invocation to blocked when targetPath does not match", async () => {
    const root = path.join(fixturesRoot, "paths-scoped");
    const result = await discover({ repositoryRoot: root, targetPath: "docs/readme.md" });
    const skill = result.skills[0]!;
    expect(skill.invocation.implicit).toBe("blocked");
  });

  it("leaves implicit invocation unknown-by-assumption without a targetPath", async () => {
    const root = path.join(fixturesRoot, "paths-scoped");
    const result = await discover({ repositoryRoot: root });
    const skill = result.skills[0]!;
    expect(skill.invocation.implicit).toBe("unknown");
    const diagnostic = result.diagnostics.find((d) => d.code === "assumption");
    expect(diagnostic).toBeDefined();
  });
});

describe("symlinked skill directories", () => {
  it("follows an in-repository skill symlink but rejects an outside-repository target", async () => {
    // A `Dirent` reports a symlink-to-directory as a symlink, not a directory,
    // so a skill shared by symlink - the natural way to hand one SKILL.md to
    // both harnesses - must not be dropped and reported as missing from Claude
    // Code. Escaping the repository is still refused, with a diagnostic rather
    // than a silent omission.
    const repositoryRoot = path.join(fixturesRoot, "symlinked", "repo");
    const result = await discover({ repositoryRoot });
    const names = result.skills.map((skill) => skill.name);
    expect(names).toContain("shared-deploy");
    expect(names).not.toContain("external");
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "outside-repository",
        source: expect.objectContaining({ path: ".claude/skills/external/SKILL.md" }),
      }),
    );
  });

  it("keeps the visible symlinked path as provenance", async () => {
    const repositoryRoot = path.join(fixturesRoot, "symlinked", "repo");
    const result = await discover({ repositoryRoot });
    const skill = result.skills.find((candidate) => candidate.name === "shared-deploy");
    expect(skill?.source.path).toBe(".claude/skills/linked/SKILL.md");
  });
});
