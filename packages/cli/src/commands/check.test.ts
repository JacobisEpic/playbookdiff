import { describe, expect, it } from "vitest";
import { EXIT_ACTIONABLE_FINDINGS, EXIT_ANALYSIS_ERROR, EXIT_SUCCESS } from "../exit-codes.js";
import { cwdTargetFixture, parityFixture, semanticUnknownFixture } from "../test-fixtures.js";
import { runCheck } from "./check.js";

describe("runCheck", () => {
  it("Scenario A: exits 1 with two medium findings (missing instruction + skill capability gap)", async () => {
    const outcome = await runCheck({
      repository: cwdTargetFixture,
      cwd: ".",
      targetPath: "apps/api/file.ts",
      json: false,
    });
    expect(outcome.exitCode).toBe(EXIT_ACTIONABLE_FINDINGS);
    expect(outcome.stdout).toContain("Instruction missing");
    expect(outcome.stdout).toContain("Skill capability gap");
    expect(outcome.stdout).toContain("Findings: 2 medium, 0 low, 0 info");
  });

  it("Scenario B: modeling cwd=apps/api leaves only the instruction scope gap", async () => {
    const outcome = await runCheck({
      repository: cwdTargetFixture,
      cwd: "apps/api",
      targetPath: "apps/api/file.ts",
      json: false,
    });
    expect(outcome.exitCode).toBe(EXIT_ACTIONABLE_FINDINGS);
    expect(outcome.stdout).toContain("Findings: 1 medium, 0 low, 0 info");
    expect(outcome.stdout).toContain("Instruction scope gap");
    expect(outcome.stdout).not.toContain("missing");
    expect(outcome.stdout).not.toContain("capability gap");
  });

  it("parity fixture: exits 0 with zero findings", async () => {
    const outcome = await runCheck({ repository: parityFixture, cwd: ".", json: false });
    expect(outcome.exitCode).toBe(EXIT_SUCCESS);
    expect(outcome.stdout).toContain("No compatibility findings.");
  });

  it("semantic-unknown fixture: exits 0 despite a reported uncertainty", async () => {
    const outcome = await runCheck({ repository: semanticUnknownFixture, cwd: ".", json: false });
    expect(outcome.exitCode).toBe(EXIT_SUCCESS);
    expect(outcome.stdout).toContain("Findings: 0 medium, 0 low, 1 info");
  });

  it("--json produces valid JSON reflecting the same exit code and findings", async () => {
    const outcome = await runCheck({
      repository: cwdTargetFixture,
      cwd: ".",
      targetPath: "apps/api/file.ts",
      json: true,
    });
    expect(outcome.exitCode).toBe(EXIT_ACTIONABLE_FINDINGS);
    expect(outcome.stderr).toBeUndefined();
    const parsed = JSON.parse(outcome.stdout ?? "");
    expect(parsed.report.findings).toHaveLength(2);
  });

  it("returns exit code 2 with a clean stderr message for a nonexistent repository", async () => {
    const outcome = await runCheck({ repository: "/no/such/repository", cwd: ".", json: false });
    expect(outcome.exitCode).toBe(EXIT_ANALYSIS_ERROR);
    expect(outcome.stdout).toBeUndefined();
    expect(outcome.stderr).toMatch(/^Error: /);
    expect(outcome.stderr).not.toContain("at ");
  });

  it("returns exit code 2 when cwd escapes the repository", async () => {
    const outcome = await runCheck({ repository: parityFixture, cwd: "../../etc", json: false });
    expect(outcome.exitCode).toBe(EXIT_ANALYSIS_ERROR);
    expect(outcome.stderr).toMatch(/^Error: /);
  });
});
