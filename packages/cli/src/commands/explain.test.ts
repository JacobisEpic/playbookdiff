import { describe, expect, it } from "vitest";
import { EXIT_ANALYSIS_ERROR, EXIT_SUCCESS } from "../exit-codes.js";
import { cwdTargetFixture } from "../test-fixtures.js";
import { runCheck } from "./check.js";
import { runExplain } from "./explain.js";

async function getScenarioAFindingId(): Promise<string> {
  const checkOutcome = await runCheck({
    repository: cwdTargetFixture,
    cwd: ".",
    targetPath: "apps/api/file.ts",
    json: true,
  });
  const parsed = JSON.parse(checkOutcome.stdout ?? "");
  const id = parsed.report.findings[0]?.id;
  if (typeof id !== "string") throw new Error("expected at least one finding id from check");
  return id;
}

describe("runExplain", () => {
  it("finds and explains a real finding ID produced by check for the same context", async () => {
    const findingId = await getScenarioAFindingId();
    const outcome = await runExplain({
      findingId,
      repository: cwdTargetFixture,
      cwd: ".",
      targetPath: "apps/api/file.ts",
      json: false,
    });
    expect(outcome.exitCode).toBe(EXIT_SUCCESS);
    expect(outcome.stdout).toContain(`Finding: ${findingId}`);
    expect(outcome.stdout).toContain("Why PlaybookDiff reported this");
  });

  it("supports --json for a real finding", async () => {
    const findingId = await getScenarioAFindingId();
    const outcome = await runExplain({
      findingId,
      repository: cwdTargetFixture,
      cwd: ".",
      targetPath: "apps/api/file.ts",
      json: true,
    });
    expect(outcome.exitCode).toBe(EXIT_SUCCESS);
    const parsed = JSON.parse(outcome.stdout ?? "");
    expect(parsed.finding.id).toBe(findingId);
  });

  it("returns exit code 2 for a finding ID that does not exist in this context", async () => {
    const outcome = await runExplain({
      findingId: "instruction:missing:right:does-not-exist:000000000000",
      repository: cwdTargetFixture,
      cwd: ".",
      targetPath: "apps/api/file.ts",
      json: false,
    });
    expect(outcome.exitCode).toBe(EXIT_ANALYSIS_ERROR);
    expect(outcome.stdout).toBeUndefined();
    expect(outcome.stderr).toContain("was not found for this analysis context");
  });

  it("does not fuzzy-match: a finding that exists only in a different scope is reported as not found", async () => {
    // This ID is valid for cwd=. but the finding disappears once cwd=apps/api
    // (Scenario B), so explain must not guess a nearby match.
    const findingId = await getScenarioAFindingId();
    const outcome = await runExplain({
      findingId,
      repository: cwdTargetFixture,
      cwd: "apps/api",
      targetPath: "apps/api/file.ts",
      json: false,
    });
    expect(outcome.exitCode).toBe(EXIT_ANALYSIS_ERROR);
  });

  it("returns exit code 2 for an invalid repository", async () => {
    const outcome = await runExplain({
      findingId: "anything",
      repository: "/no/such/repository",
      cwd: ".",
      json: false,
    });
    expect(outcome.exitCode).toBe(EXIT_ANALYSIS_ERROR);
    expect(outcome.stderr).toMatch(/^Error: /);
  });
});
