import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cwdTargetFixture, parityFixture, semanticUnknownFixture } from "./test-fixtures.js";

const binPath = path.join(import.meta.dirname, "..", "dist", "bin.js");

function run(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [binPath, ...args], { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe("built playbookdiff binary", () => {
  it("--version exits 0 and prints a bare version string", () => {
    const { status, stdout, stderr } = run(["--version"]);
    expect(status).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(stderr).toBe("");
  });

  it("--help exits 0", () => {
    const { status, stdout } = run(["--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("USAGE");
  });

  it("check on the parity fixture exits 0", () => {
    const { status, stdout } = run(["check", parityFixture]);
    expect(status).toBe(0);
    expect(stdout).toContain("PlaybookDiff");
  });

  it("check on the Scenario A fixture exits 1 with two medium findings", () => {
    const { status, stdout } = run(["check", cwdTargetFixture, "--path", "apps/api/file.ts"]);
    expect(status).toBe(1);
    expect(stdout).toContain("Instruction missing");
    expect(stdout).toContain("Skill capability gap");
  });

  it("check on the semantic-unknown fixture exits 0", () => {
    const { status } = run(["check", semanticUnknownFixture]);
    expect(status).toBe(0);
  });

  it("check --json produces parseable JSON on stdout with an empty stderr", () => {
    const { status, stdout, stderr } = run(["check", parityFixture, "--json"]);
    expect(status).toBe(0);
    expect(stderr).toBe("");
    expect(() => JSON.parse(stdout)).not.toThrow();
  });

  it("explain round-trips a finding ID produced by check", () => {
    const checkResult = run(["check", cwdTargetFixture, "--path", "apps/api/file.ts", "--json"]);
    const findingId: string = JSON.parse(checkResult.stdout).report.findings[0].id;

    const { status, stdout } = run([
      "explain",
      findingId,
      cwdTargetFixture,
      "--path",
      "apps/api/file.ts",
    ]);
    expect(status).toBe(0);
    expect(stdout).toContain(`Finding: ${findingId}`);
  });

  it("explain with an unknown finding ID exits 2 with a clean message", () => {
    const { status, stdout, stderr } = run(["explain", "does-not-exist", parityFixture]);
    expect(status).toBe(2);
    expect(stdout).toBe("");
    expect(stderr).toContain("was not found");
  });

  it("a nonexistent repository exits 2 without a stack trace", () => {
    const { status, stderr } = run(["check", "/no/such/repository"]);
    expect(status).toBe(2);
    expect(stderr).toMatch(/^Error: /);
    expect(stderr).not.toContain(".js:");
  });

  it("is deterministic across repeated runs against the same fixture", () => {
    const first = run(["check", cwdTargetFixture, "--path", "apps/api/file.ts", "--json"]);
    const second = run(["check", cwdTargetFixture, "--path", "apps/api/file.ts", "--json"]);
    expect(first.stdout).toBe(second.stdout);
  });
});
