import { promises as fs } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

const repoRoot = path.join(import.meta.dirname, "..", "..", "..");
const actionYmlPath = path.join(repoRoot, "action.yml");

type ActionYml = {
  name?: unknown;
  description?: unknown;
  inputs?: Record<string, { description?: unknown; required?: unknown; default?: unknown }>;
  outputs?: Record<string, { description?: unknown }>;
  runs?: { using?: unknown; main?: unknown };
};

async function readActionYml(): Promise<ActionYml> {
  const raw = await fs.readFile(actionYmlPath, "utf8");
  return parse(raw) as ActionYml;
}

describe("action.yml", () => {
  it("declares a name and description", async () => {
    const doc = await readActionYml();
    expect(typeof doc.name).toBe("string");
    expect((doc.name as string).length).toBeGreaterThan(0);
    expect(typeof doc.description).toBe("string");
    expect((doc.description as string).length).toBeGreaterThan(0);
  });

  it("runs as a node24 JavaScript action pointing at the committed bundle", async () => {
    const doc = await readActionYml();
    expect(doc.runs?.using).toBe("node24");
    expect(typeof doc.runs?.main).toBe("string");
    const mainPath = path.join(repoRoot, doc.runs?.main as string);
    await expect(fs.stat(mainPath)).resolves.toBeTruthy();
  });

  it("declares baseline, candidate, cwd, and path inputs, each with a description", async () => {
    const doc = await readActionYml();
    const inputNames = Object.keys(doc.inputs ?? {});
    expect(inputNames.sort()).toEqual(["baseline", "candidate", "cwd", "path"]);
    for (const [name, spec] of Object.entries(doc.inputs ?? {})) {
      expect(typeof spec.description, `${name} description`).toBe("string");
      expect((spec.description as string).length, `${name} description`).toBeGreaterThan(0);
    }
  });

  it("declares the documented outputs, each with a description", async () => {
    const doc = await readActionYml();
    const outputNames = Object.keys(doc.outputs ?? {}).sort();
    expect(outputNames).toEqual(
      [
        "baseline-sha",
        "candidate-sha",
        "introduced-actionable-count",
        "introduced-count",
        "introduced-informational-count",
        "resolved-count",
        "result",
        "unchanged-count",
      ].sort(),
    );
    for (const [name, spec] of Object.entries(doc.outputs ?? {})) {
      expect(typeof spec.description, `${name} description`).toBe("string");
      expect((spec.description as string).length, `${name} description`).toBeGreaterThan(0);
    }
  });

  it("does not require any input by default (cwd has a default, everything else is optional)", async () => {
    const doc = await readActionYml();
    for (const [name, spec] of Object.entries(doc.inputs ?? {})) {
      expect(spec.required, name).not.toBe(true);
    }
    expect(doc.inputs?.cwd?.default).toBe(".");
  });
});
