import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compileCodexConfig } from "./compile.js";

const fixtures = path.join(import.meta.dirname, "..", "test", "fixtures", "skills");
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true })));
});

describe("Codex skill discovery", () => {
  it("discovers cwd-upward skills and preserves duplicate names by source identity", async () => {
    const repositoryRoot = path.join(fixtures, "repo");
    const config = await compileCodexConfig({
      repositoryRoot,
      cwd: path.join(repositoryRoot, "apps", "api"),
      mode: "repo",
    });
    expect(
      config.skills.filter((skill) => skill.name === "review").map((skill) => skill.path),
    ).toEqual([
      "apps/api/.agents/skills/api-review/SKILL.md",
      ".agents/skills/root-review/SKILL.md",
    ]);
  });

  it("does not scan nested skill roots merely because targetPath is deeper", async () => {
    const repositoryRoot = path.join(fixtures, "repo");
    const config = await compileCodexConfig({
      repositoryRoot,
      cwd: repositoryRoot,
      targetPath: "apps/api/future.ts",
      mode: "repo",
    });
    expect(config.skills.map((skill) => skill.name)).not.toContain("blocked");
    expect(config.skills.filter((skill) => skill.name === "review")).toHaveLength(1);
  });

  it("maps allow_implicit_invocation false without blocking explicit invocation", async () => {
    const repositoryRoot = path.join(fixtures, "repo");
    const config = await compileCodexConfig({
      repositoryRoot,
      cwd: path.join(repositoryRoot, "apps", "api"),
      mode: "repo",
    });
    const skill = config.skills.find((candidate) => candidate.name === "blocked");
    expect(skill?.invocation).toEqual({ explicit: "allowed", implicit: "blocked" });
    expect(skill?.advertisement.state).toBe("hidden");
    expect(skill?.metadataSources?.map((source) => source.path)).toContain(
      "apps/api/.agents/skills/blocked/agents/openai.yaml",
    );
  });

  it("follows an in-repository skill symlink but rejects an outside-repository target", async () => {
    const repositoryRoot = path.join(fixtures, "repo");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    expect(config.skills.map((skill) => skill.name)).toContain("linked");
    expect(config.skills.map((skill) => skill.name)).not.toContain("external");
    expect(config.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "outside-repository",
        source: expect.objectContaining({ path: ".agents/skills/external/SKILL.md" }),
      }),
    );
  });

  it("does not claim runtime availability when required skill metadata is missing", async () => {
    const repositoryRoot = path.join(fixtures, "repo");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    const skill = config.skills.find((candidate) => candidate.name === "missing-metadata");
    expect(skill).toMatchObject({
      discovery: { state: "unknown" },
      invocation: { explicit: "unknown", implicit: "unknown" },
      advertisement: { state: "unknown" },
    });
    expect(config.diagnostics).toContainEqual(expect.objectContaining({ code: "parse-error" }));
  });

  it("marks repository-visible skill metadata as budget-risk above the fallback budget", async () => {
    const repositoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "playbookdiff-codex-budget-"));
    temporaryRoots.push(repositoryRoot);
    const skillDir = path.join(repositoryRoot, ".agents", "skills", "large");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---\nname: large\ndescription: ${"x".repeat(8_100)}\n---\n\nUse it.\n`,
    );
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    expect(config.skills[0]?.advertisement).toMatchObject({
      state: "budget-risk",
      aggregateBudget: { maxContextFraction: 0.02, fallbackChars: 8_000 },
    });
    expect(config.diagnostics).toContainEqual(expect.objectContaining({ code: "budget-risk" }));
  });
});
