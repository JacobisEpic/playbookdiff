import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCodexConfig } from "./config.js";
import { IdRegistry } from "./diagnostics.js";
import { validateAnalysisContext } from "./paths.js";
import { compileCodexConfig } from "./compile.js";

const fixtures = path.join(import.meta.dirname, "..", "test", "fixtures", "config");

describe("Codex project configuration", () => {
  it("resolves scalar project config from root to closest cwd layer with TOML provenance", async () => {
    const repositoryRoot = path.join(fixtures, "layers");
    const ctx = await validateAnalysisContext({
      repositoryRoot,
      cwd: path.join(repositoryRoot, "apps", "api"),
      mode: "repo",
    });
    const config = await loadCodexConfig(ctx, new IdRegistry());
    expect(config.layers.map((layer) => layer.path)).toEqual([
      ".codex/config.toml",
      "apps/api/.codex/config.toml",
    ]);
    expect(config.maxBytes.value).toBe(200);
    expect(config.maxBytes.source).toMatchObject({
      path: "apps/api/.codex/config.toml",
      lineStart: 2,
      lineEnd: 2,
    });
    expect(config.fallbackFilenames.value).toEqual(["NESTED.md"]);
    expect(config.rootMarkers?.value).toEqual([".git"]);
  });

  it("surfaces trust and explicit-root assumptions without inspecting hidden layers", async () => {
    const repositoryRoot = path.join(fixtures, "layers");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    expect(config.assumptions.join(" ")).toContain("assumed trusted");
    expect(config.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "local-config-unavailable",
        "managed-config-unavailable",
        "assumption",
      ]),
    );
  });

  it("diagnoses malformed TOML with source location and continues", async () => {
    const repositoryRoot = path.join(fixtures, "malformed");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    expect(config.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "parse-error",
        source: expect.objectContaining({ path: ".codex/config.toml", lineStart: 2 }),
      }),
    );
    expect(config.instructions).toEqual([]);
  });

  it("leaves skills.config unresolved while official path semantics conflict", async () => {
    const repositoryRoot = path.join(fixtures, "skills-ambiguous");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    expect(config.skills).toEqual([]);
    expect(config.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "unresolved",
        source: expect.objectContaining({ path: ".codex/config.toml" }),
      }),
    );
  });
});
