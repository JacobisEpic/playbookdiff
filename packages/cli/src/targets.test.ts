import { describe, expect, it } from "vitest";
import {
  deriveAnalysisTargets,
  governingDirectory,
  isConfigurationPath,
  selectPatternRepresentatives,
  MAX_DERIVED_TARGETS,
} from "./targets.js";

function paths(input: Parameters<typeof deriveAnalysisTargets>[0]): (string | undefined)[] {
  return deriveAnalysisTargets(input).targets.map((target) => target.path);
}

describe("governingDirectory", () => {
  it("maps a nested instruction file to the directory it governs", () => {
    expect(governingDirectory("apps/api/CLAUDE.md")).toBe("apps/api");
    expect(governingDirectory("apps/api/AGENTS.md")).toBe("apps/api");
    expect(governingDirectory("apps/api/AGENTS.override.md")).toBe("apps/api");
    expect(governingDirectory("CLAUDE.md")).toBe(".");
  });

  it("collapses the harness-specific container directory rather than the file's parent", () => {
    // A rule governs the project directory, not `.claude/rules`, so a changed
    // rule and a changed instruction file beside it resolve to one scope.
    expect(governingDirectory("apps/api/.claude/rules/go.md")).toBe("apps/api");
    expect(governingDirectory("apps/api/.claude/skills/deploy/SKILL.md")).toBe("apps/api");
    expect(governingDirectory("apps/api/.agents/skills/deploy/SKILL.md")).toBe("apps/api");
    expect(governingDirectory("apps/api/.codex/config.toml")).toBe("apps/api");
    expect(governingDirectory(".claude/rules/go.md")).toBe(".");
    expect(governingDirectory(".mcp.json")).toBe(".");
  });

  it("does not treat an ordinary source file as configuration", () => {
    expect(governingDirectory("apps/api/main.go")).toBeUndefined();
    expect(isConfigurationPath("apps/api/main.go")).toBe(false);
    expect(isConfigurationPath("apps/api/CLAUDE.md")).toBe(true);
  });

  it("does not mistake a similarly named file for an instruction source", () => {
    expect(governingDirectory("docs/CLAUDE.md.tmpl")).toBeUndefined();
    expect(governingDirectory("docs/about-AGENTS.md")).toBeUndefined();
  });
});

describe("deriveAnalysisTargets", () => {
  it("always includes the startup context so root configuration stays covered", () => {
    expect(paths({ changedPaths: [] })).toEqual([undefined]);
    expect(paths({ changedPaths: ["CLAUDE.md"] })).toEqual([undefined]);
  });

  it("does not add a scope for root configuration, which the startup context already models", () => {
    expect(paths({ changedPaths: ["CLAUDE.md", ".claude/rules/go.md", ".mcp.json"] })).toEqual([
      undefined,
    ]);
  });

  it("adds the governing directory when nested configuration changes", () => {
    expect(paths({ changedPaths: ["server/CLAUDE.md"] })).toEqual([undefined, "server"]);
  });

  it("adds a changed source file, so configuration nested above it applies", () => {
    expect(paths({ changedPaths: ["server/routes.go"] })).toEqual([undefined, "server/routes.go"]);
  });

  it("collapses many changed files in one directory into a single context", () => {
    const changedPaths = Array.from({ length: 100 }, (_, index) => `server/file${index}.go`);
    const result = deriveAnalysisTargets({ changedPaths });
    expect(result.targets).toHaveLength(2);
    expect(result.omitted).toBe(0);
  });

  it("keeps distinct directories as distinct contexts", () => {
    expect(paths({ changedPaths: ["a/one.go", "b/two.go", "c/three.go"] })).toEqual([
      undefined,
      "a/one.go",
      "b/two.go",
      "c/three.go",
    ]);
  });

  it("prefers a real changed file over the bare directory for the same scope", () => {
    // Both describe the same descent, but a file also exercises path-scoped
    // rules, so the file is the more useful representative of the two.
    expect(paths({ changedPaths: ["server/CLAUDE.md", "server/routes.go"] })).toEqual([
      undefined,
      "server/routes.go",
    ]);
  });

  it("separates two files in one directory only when a changed pattern tells them apart", () => {
    const changedPaths = ["server/main.go", "server/main_test.go"];
    expect(paths({ changedPaths })).toEqual([undefined, "server/main.go"]);
    expect(paths({ changedPaths, changedPathPatterns: ["**/*_test.go"] })).toEqual([
      undefined,
      "server/main.go",
      "server/main_test.go",
    ]);
  });

  it("does not split a scope for a changed pattern that matches neither file", () => {
    expect(
      paths({
        changedPaths: ["server/main.go", "server/other.go"],
        changedPathPatterns: ["**/*.py"],
      }),
    ).toEqual([undefined, "server/main.go"]);
  });

  it("treats a rename's two sides as the scopes they are, without duplicating either", () => {
    const result = deriveAnalysisTargets({ changedPaths: ["old/thing.go", "new/thing.go"] });
    expect(result.targets.map((target) => target.path)).toEqual([
      undefined,
      "new/thing.go",
      "old/thing.go",
    ]);
    expect(new Set(result.targets.map((target) => target.path)).size).toBe(3);
  });

  it("collapses a rename inside one directory to a single context", () => {
    expect(paths({ changedPaths: ["server/old.go", "server/new.go"] })).toEqual([
      undefined,
      "server/new.go",
    ]);
  });

  it("orders contexts deterministically regardless of input order", () => {
    const forward = paths({ changedPaths: ["b/x.go", "a/y.go", "c/z.go"] });
    const reversed = paths({ changedPaths: ["c/z.go", "a/y.go", "b/x.go"] });
    expect(forward).toEqual(reversed);
  });

  it("bounds the number of contexts and reports how many it dropped", () => {
    const changedPaths = Array.from({ length: 80 }, (_, index) => `dir${index}/file.go`);
    const result = deriveAnalysisTargets({ changedPaths });
    expect(result.targets).toHaveLength(MAX_DERIVED_TARGETS);
    expect(result.omitted).toBe(81 - MAX_DERIVED_TARGETS);
    expect(result.targets[0]?.path).toBeUndefined();
  });

  it("includes a representative located for a changed path-scoped rule", () => {
    expect(
      paths({
        changedPaths: [".claude/rules/testing.md"],
        changedPathPatterns: ["**/*_test.go"],
        patternRepresentatives: ["server/main_test.go"],
      }),
    ).toEqual([undefined, "server/main_test.go"]);
  });
});

describe("selectPatternRepresentatives", () => {
  it("prefers a path the pull request already changed", () => {
    expect(
      selectPatternRepresentatives({
        patterns: ["**/*_test.go"],
        changedPaths: ["server/main_test.go"],
        trackedPaths: ["other/a_test.go", "server/main_test.go"],
      }),
    ).toEqual(["server/main_test.go"]);
  });

  it("falls back to the first tracked match when the pull request changed none", () => {
    expect(
      selectPatternRepresentatives({
        patterns: ["**/*_test.go"],
        changedPaths: ["README.md"],
        trackedPaths: ["z/last_test.go", "a/first_test.go"],
      }),
    ).toEqual(["a/first_test.go"]);
  });

  it("returns nothing when the repository has no file the pattern governs", () => {
    // A scope with no files is a scope no session can reach; inventing one
    // would report divergence nobody can encounter.
    expect(
      selectPatternRepresentatives({
        patterns: ["**/*.rs"],
        changedPaths: ["README.md"],
        trackedPaths: ["README.md", "main.go"],
      }),
    ).toEqual([]);
  });
});
