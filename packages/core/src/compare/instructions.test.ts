import { describe, expect, it } from "vitest";
import type { EffectiveAgentConfig, EffectiveInstruction, HarnessId } from "../types/index.js";
import { compareInstructions } from "./instructions.js";

function instruction(
  id: string,
  content: string,
  path: string,
  options: Partial<Pick<EffectiveInstruction, "scope" | "loadPhase" | "order">> = {},
): EffectiveInstruction {
  return {
    id,
    content,
    source: { path, lineStart: 1, lineEnd: 1, scope: "repository", format: "markdown" },
    scope: options.scope ?? { appliesTo: ["."] },
    loadPhase: options.loadPhase ?? "startup",
    order: options.order ?? 0,
  };
}

function config(harness: HarnessId, instructions: EffectiveInstruction[]): EffectiveAgentConfig {
  return {
    harness,
    target: { repositoryRoot: ".", cwd: ".", mode: "repo" },
    instructions,
    skills: [],
    mcpServers: [],
    provenance: [],
    diagnostics: [],
    assumptions: [],
  };
}

describe("deterministic instruction comparison", () => {
  it("treats exact content in different native filenames as equivalent", () => {
    const result = compareInstructions(
      config("claude", [instruction("left", "Run tests.\n", "CLAUDE.md")]),
      config("codex", [instruction("right", "Run tests.\n", "AGENTS.md")]),
    );
    expect(result.findings).toEqual([]);
    expect(result.entities).toEqual([
      expect.objectContaining({ category: "instruction", status: "equivalent" }),
    ]);
  });

  it("normalizes CRLF and one optional final newline", () => {
    const result = compareInstructions(
      config("claude", [instruction("left", "One\r\nTwo\r\n", "CLAUDE.md")]),
      config("codex", [instruction("right", "One\nTwo", "AGENTS.md")]),
    );
    expect(result.findings).toEqual([]);
  });

  it("preserves additional trailing blank lines as meaningful", () => {
    const result = compareInstructions(
      config("claude", [instruction("left", "One\n\n", "CLAUDE.md")]),
      config("codex", [instruction("right", "One\n", "AGENTS.md")]),
    );
    expect(result.findings[0]).toMatchObject({ type: "unknown", severity: "info" });
  });

  it("reports exact content with a different load phase as a scope gap", () => {
    const result = compareInstructions(
      config("claude", [
        instruction("left", "Run tests.\n", "CLAUDE.md", { loadPhase: "on-demand" }),
      ]),
      config("codex", [instruction("right", "Run tests.\n", "AGENTS.md")]),
    );
    expect(result.findings).toEqual([
      expect.objectContaining({ type: "scope-gap", severity: "medium" }),
    ]);
    expect(result.findings[0]?.evidence).toHaveLength(2);
  });

  it("reports exact content with a different scope as a scope gap", () => {
    const result = compareInstructions(
      config("claude", [instruction("left", "Run tests.", "CLAUDE.md")]),
      config("codex", [
        instruction("right", "Run tests.", "AGENTS.md", {
          scope: { appliesTo: ["apps/api"] },
        }),
      ]),
    );
    expect(result.findings[0]).toMatchObject({ category: "instruction", type: "scope-gap" });
  });

  it("reports different prose in the same scope as unknown, never conflict", () => {
    const result = compareInstructions(
      config("claude", [instruction("left", "Run tests before pushing.", "CLAUDE.md")]),
      config("codex", [instruction("right", "Make sure tests pass before you push.", "AGENTS.md")]),
    );
    expect(result.findings).toEqual([
      expect.objectContaining({ type: "unknown", severity: "info", confidence: "deterministic" }),
    ]);
    expect(result.findings.some((finding) => finding.type === "conflict")).toBe(false);
  });

  it("reports a one-sided instruction as missing with medium severity and direction", () => {
    const result = compareInstructions(
      config("claude", [instruction("left", "Run tests.", "CLAUDE.md")]),
      config("codex", []),
    );
    expect(result.findings[0]).toMatchObject({
      type: "missing",
      severity: "medium",
      left: { present: true },
      right: { present: false },
    });
    expect(result.findings[0]?.id).toContain(":right:");
    expect(result.findings[0]?.evidence).toHaveLength(1);
  });

  describe("canonical applicability normalization", () => {
    it("treats equivalent spellings of the same location as the same scope", () => {
      const result = compareInstructions(
        config("claude", [
          instruction("left", "Run tests.\n", "server/CLAUDE.md", {
            scope: { appliesTo: ["./server/"] },
          }),
        ]),
        config("codex", [
          instruction("right", "Run tests.\n", "server/AGENTS.md", {
            scope: { appliesTo: ["server"] },
          }),
        ]),
      );
      expect(result.findings).toEqual([]);
      expect(result.entities).toEqual([
        expect.objectContaining({ category: "instruction", status: "equivalent" }),
      ]);
    });

    it("normalizes exclusions with the same coordinate system", () => {
      const result = compareInstructions(
        config("claude", [
          instruction("left", "Run tests.\n", "CLAUDE.md", {
            scope: { appliesTo: ["."], excludedFrom: ["./vendor/"] },
          }),
        ]),
        config("codex", [
          instruction("right", "Run tests.\n", "AGENTS.md", {
            scope: { appliesTo: ["."], excludedFrom: ["vendor"] },
          }),
        ]),
      );
      expect(result.findings).toEqual([]);
    });

    it("still reports a genuinely different location as a scope gap", () => {
      const result = compareInstructions(
        config("claude", [
          instruction("left", "Run tests.\n", "server/CLAUDE.md", {
            scope: { appliesTo: ["server"] },
          }),
        ]),
        config("codex", [
          instruction("right", "Run tests.\n", "apps/api/AGENTS.md", {
            scope: { appliesTo: ["apps/api"] },
          }),
        ]),
      );
      expect(result.findings).toEqual([
        expect.objectContaining({ type: "scope-gap", severity: "medium" }),
      ]);
    });

    it("still reports a genuinely different load phase as a scope gap", () => {
      const result = compareInstructions(
        config("claude", [
          instruction("left", "Run tests.\n", "server/CLAUDE.md", {
            scope: { appliesTo: ["server"] },
            loadPhase: "on-demand",
          }),
        ]),
        config("codex", [
          instruction("right", "Run tests.\n", "server/AGENTS.md", {
            scope: { appliesTo: ["server"] },
          }),
        ]),
      );
      expect(result.findings).toEqual([
        expect.objectContaining({ type: "scope-gap", severity: "medium" }),
      ]);
    });
  });

  describe("one-sided coverage is not masked by unmatched prose on the other side", () => {
    const substantive =
      "# AGENTS.md\n\n## Building\n\nRun `cmake -B build .`.\n\n## Testing\n\nRun `go test ./...`.\n";
    const pointerStub =
      "# CLAUDE.md\n\nSee `AGENTS.md` for the shared agent instructions for this repository.\n";

    it("reports the deterministic gap even though both sides have unmatched prose", () => {
      const result = compareInstructions(
        config("claude", [instruction("left", pointerStub, "CLAUDE.md")]),
        config("codex", [instruction("right", substantive, "AGENTS.md")]),
      );
      const coverage = result.findings.filter((finding) => finding.type === "missing");
      expect(coverage).toHaveLength(1);
      expect(coverage[0]).toMatchObject({ severity: "medium", confidence: "deterministic" });
      expect(coverage[0]?.explanation).toContain("Codex has");
      expect(coverage[0]?.explanation).toContain("Claude Code does not receive");
      // The stub's own prose is still genuinely ambiguous, so the bucket keeps
      // its informational unknown alongside the proved coverage gap.
      expect(result.findings.filter((finding) => finding.type === "unknown")).toHaveLength(1);
      expect(result.entities.some((entity) => entity.status === "divergent")).toBe(true);
    });

    it("does not let a larger stub absorb more coverage than it contains", () => {
      // Four unmatched units on the Claude side can pair with at most four of
      // Codex's five, leaving exactly one deterministic surplus.
      const fourUnits = "# CLAUDE.md\n\nOne.\n\nTwo.\n\nThree.\n";
      const fiveUnits = "# AGENTS.md\n\nA.\n\nB.\n\nC.\n\nD.\n";
      const result = compareInstructions(
        config("claude", [instruction("left", fourUnits, "CLAUDE.md")]),
        config("codex", [instruction("right", fiveUnits, "AGENTS.md")]),
      );
      const coverage = result.findings.filter((finding) => finding.type === "missing");
      expect(coverage).toHaveLength(1);
      expect(coverage[0]?.explanation).toContain("1 instruction content unit ");
    });

    it("keeps symmetric unmatched prose informational with no coverage finding", () => {
      const result = compareInstructions(
        config("claude", [instruction("left", "Run the test suite.\n", "CLAUDE.md")]),
        config("codex", [instruction("right", "Execute all tests.\n", "AGENTS.md")]),
      );
      expect(result.findings.map((finding) => finding.type)).toEqual(["unknown"]);
      expect(result.findings[0]?.severity).toBe("info");
    });

    it("reports a strict subset as coverage only, with no residual unknown", () => {
      const result = compareInstructions(
        config("claude", [instruction("left", "Shared.\n\nAlso shared.\n", "CLAUDE.md")]),
        config("codex", [
          instruction("right", "Shared.\n\nAlso shared.\n\nCodex only.\n", "AGENTS.md"),
        ]),
      );
      expect(result.findings.map((finding) => finding.type)).toEqual(["missing"]);
      expect(result.findings[0]?.severity).toBe("medium");
    });

    it("still reports unknown when only whitespace differs and every unit matches", () => {
      const result = compareInstructions(
        config("claude", [instruction("left", "One\n\n\n", "CLAUDE.md")]),
        config("codex", [instruction("right", "One\n", "AGENTS.md")]),
      );
      expect(result.findings.map((finding) => finding.type)).toEqual(["unknown"]);
    });

    it("detects one-sided coverage in the Claude Code direction too", () => {
      const result = compareInstructions(
        config("claude", [instruction("left", "# CLAUDE.md\n\nA.\n\nB.\n\nC.\n", "CLAUDE.md")]),
        config("codex", [instruction("right", "# AGENTS.md\n", "AGENTS.md")]),
      );
      const coverage = result.findings.filter((finding) => finding.type === "missing");
      expect(coverage).toHaveLength(1);
      expect(coverage[0]?.explanation).toContain("Claude Code has");
      expect(coverage[0]?.explanation).toContain("Codex does not receive");
    });

    it("keeps the coverage finding id stable across unrelated line shifts", () => {
      const first = compareInstructions(
        config("claude", [instruction("left", pointerStub, "CLAUDE.md")]),
        config("codex", [instruction("right", substantive, "AGENTS.md")]),
      );
      const second = compareInstructions(
        config("claude", [instruction("left", pointerStub, "CLAUDE.md", { order: 7 })]),
        config("codex", [instruction("right", substantive, "docs/AGENTS.md", { order: 9 })]),
      );
      const idOf = (result: ReturnType<typeof compareInstructions>): string | undefined =>
        result.findings.find((finding) => finding.type === "missing")?.id;
      expect(idOf(first)).toBe(idOf(second));
      expect(idOf(first)).toContain("instruction:missing:left:");
    });
  });

  it("pairs duplicate exact instructions deterministically", () => {
    const left = [
      instruction("left-api", "Same.", "apps/api/CLAUDE.md", {
        scope: { appliesTo: ["apps/api"] },
        order: 1,
      }),
      instruction("left-root", "Same.", "CLAUDE.md", { order: 0 }),
    ];
    const right = [
      instruction("right-root", "Same.", "AGENTS.md", { order: 0 }),
      instruction("right-api", "Same.", "apps/api/AGENTS.md", {
        scope: { appliesTo: ["apps/api"] },
        order: 1,
      }),
    ];
    const result = compareInstructions(config("claude", left), config("codex", right));
    expect(result.findings).toEqual([]);
    expect(result.entities.filter((entity) => entity.status === "equivalent")).toHaveLength(2);
  });

  it("keeps finding IDs stable when source lines shift", () => {
    const left = instruction("left", "Run tests.", "CLAUDE.md");
    const right = instruction("right", "Different.", "AGENTS.md");
    const first = compareInstructions(config("claude", [left]), config("codex", [right]));
    const shifted = {
      ...left,
      source: { ...left.source, lineStart: 200, lineEnd: 210 },
    };
    const second = compareInstructions(config("claude", [shifted]), config("codex", [right]));
    expect(second.findings[0]?.id).toBe(first.findings[0]?.id);
  });

  it("keeps existing finding IDs stable when unrelated instructions are added", () => {
    const left = instruction("left", "Run tests.", "CLAUDE.md");
    const right = instruction("right", "Different.", "AGENTS.md");
    const first = compareInstructions(config("claude", [left]), config("codex", [right]));
    const unrelated = instruction("unrelated", "Deploy safely.", "apps/web/CLAUDE.md", {
      scope: { appliesTo: ["apps/web"] },
    });
    const second = compareInstructions(
      config("claude", [left, unrelated]),
      config("codex", [right]),
    );
    expect(second.findings.map((finding) => finding.id)).toContain(first.findings[0]?.id);
  });
});
