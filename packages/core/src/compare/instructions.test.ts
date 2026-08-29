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
