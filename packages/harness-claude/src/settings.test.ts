import path from "node:path";
import { describe, expect, it } from "vitest";
import { IdRegistry } from "./diagnostics.js";
import { loadClaudeMdExcludes } from "./settings.js";

const fixturesRoot = path.join(import.meta.dirname, "..", "test", "fixtures", "settings");

describe("loadClaudeMdExcludes", () => {
  it("matches an absolute path against a configured glob pattern", async () => {
    const cwd = path.join(fixturesRoot, "valid-excludes");
    const result = await loadClaudeMdExcludes(cwd, new IdRegistry());
    expect(result.diagnostics).toHaveLength(0);
    expect(result.matches(path.join(cwd, "CLAUDE.md"))).toBe(true);
    expect(result.matches(path.join(cwd, "other.md"))).toBe(false);
  });

  it("returns no exclusions and no diagnostic when settings.json is absent", async () => {
    const cwd = path.join(fixturesRoot, "no-settings");
    const result = await loadClaudeMdExcludes(cwd, new IdRegistry());
    expect(result.diagnostics).toHaveLength(0);
    expect(result.matches(path.join(cwd, "CLAUDE.md"))).toBe(false);
  });

  it("emits a parse-error diagnostic for malformed JSON instead of throwing", async () => {
    const cwd = path.join(fixturesRoot, "malformed-json");
    const result = await loadClaudeMdExcludes(cwd, new IdRegistry());
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe("parse-error");
    expect(result.matches(path.join(cwd, "CLAUDE.md"))).toBe(false);
  });

  it("treats a non-array claudeMdExcludes value as no exclusions", async () => {
    const cwd = path.join(fixturesRoot, "non-array-excludes");
    const result = await loadClaudeMdExcludes(cwd, new IdRegistry());
    expect(result.diagnostics).toHaveLength(0);
    expect(result.matches(path.join(cwd, "CLAUDE.md"))).toBe(false);
  });

  it("does not fall back to an ancestor directory's settings.json", async () => {
    // Documented: project settings load from <cwd>/.claude/ only, unlike
    // CLAUDE.md/rules discovery, which does walk the ancestor chain.
    const ancestorRoot = path.join(fixturesRoot, "no-ancestor-fallback");
    const nestedCwd = path.join(ancestorRoot, "nested");
    const result = await loadClaudeMdExcludes(nestedCwd, new IdRegistry());
    expect(result.diagnostics).toHaveLength(0);
    expect(result.matches(path.join(ancestorRoot, "CLAUDE.md"))).toBe(false);
  });
});
