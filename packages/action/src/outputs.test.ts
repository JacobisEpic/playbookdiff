import type { DiffJsonOutput } from "playbookdiff";
import { describe, expect, it } from "vitest";
import { buildOutputs } from "./outputs.js";
import type { ActionOutcome } from "./run-action.js";

function makeJson(overrides: Partial<DiffJsonOutput["diff"]["summary"]> = {}): DiffJsonOutput {
  return {
    context: { repository: ".", cwd: "." },
    baseline: { revision: "main", commit: "a".repeat(40), diagnostics: { claude: [], codex: [] } },
    candidate: { revision: "HEAD", commit: "b".repeat(40), diagnostics: { claude: [], codex: [] } },
    diff: {
      introduced: [],
      resolved: [],
      unchanged: [],
      summary: {
        introduced: 0,
        introducedActionable: 0,
        introducedInformational: 0,
        resolved: 0,
        unchanged: 0,
        ...overrides,
      },
    },
  };
}

describe("buildOutputs", () => {
  it("reports no-new-regressions with zeroed counts for a clean success", () => {
    const outcome: ActionOutcome = { status: "success", json: makeJson() };
    expect(buildOutputs(outcome)).toEqual({
      result: "no-new-regressions",
      "introduced-count": "0",
      "introduced-actionable-count": "0",
      "introduced-informational-count": "0",
      "resolved-count": "0",
      "unchanged-count": "0",
      "baseline-sha": "a".repeat(40),
      "candidate-sha": "b".repeat(40),
    });
  });

  it("reports new-regressions with the actionable count when regressions exist", () => {
    const outcome: ActionOutcome = {
      status: "regressions",
      json: makeJson({ introduced: 1, introducedActionable: 1 }),
    };
    const outputs = buildOutputs(outcome);
    expect(outputs.result).toBe("new-regressions");
    expect(outputs["introduced-actionable-count"]).toBe("1");
  });

  it("distinguishes actionable from informational introduced counts", () => {
    const outcome: ActionOutcome = {
      status: "success",
      json: makeJson({ introduced: 2, introducedActionable: 0, introducedInformational: 2 }),
    };
    const outputs = buildOutputs(outcome);
    expect(outputs["introduced-count"]).toBe("2");
    expect(outputs["introduced-actionable-count"]).toBe("0");
    expect(outputs["introduced-informational-count"]).toBe("2");
    expect(outputs.result).toBe("no-new-regressions");
  });

  it("reports resolved and unchanged counts as plain decimal strings", () => {
    const outcome: ActionOutcome = {
      status: "success",
      json: makeJson({ resolved: 3, unchanged: 5 }),
    };
    const outputs = buildOutputs(outcome);
    expect(outputs["resolved-count"]).toBe("3");
    expect(outputs["unchanged-count"]).toBe("5");
  });

  it("outputs the full commit SHAs, not the revision labels", () => {
    const outcome: ActionOutcome = { status: "success", json: makeJson() };
    const outputs = buildOutputs(outcome);
    expect(outputs["baseline-sha"]).toBe("a".repeat(40));
    expect(outputs["candidate-sha"]).toBe("b".repeat(40));
    expect(outputs["baseline-sha"]).not.toBe("main");
  });
});
