import { describe, expect, it } from "vitest";
import type {
  CompatibilityFinding,
  EffectiveInstruction,
  EffectiveMcpServer,
} from "../types/index.js";
import { instructionEvidence, mcpEvidence, shortExcerpt } from "./evidence.js";
import { createFindingId } from "./ids.js";
import { sortFindings } from "./sort.js";
import { buildSummary } from "./summary.js";

const source = { path: "AGENTS.md", scope: "repository" as const, format: "markdown" };

function finding(
  id: string,
  category: CompatibilityFinding["category"],
  severity: CompatibilityFinding["severity"],
  type: CompatibilityFinding["type"] = "different",
): CompatibilityFinding {
  return {
    id,
    category,
    type,
    severity,
    confidence: "deterministic",
    explanation: id,
    evidence: [],
  };
}

describe("stable finding infrastructure", () => {
  it("creates stable IDs without source paths, lines, or current differing values", () => {
    const first = createFindingId({
      category: "mcp",
      type: "different",
      logicalKey: "database",
      aspect: "configuration",
    });
    const second = createFindingId({
      category: "mcp",
      type: "different",
      logicalKey: "database",
      aspect: "configuration",
    });
    expect(first).toBe(second);
    expect(first).toMatch(/^mcp:different:database:[a-f0-9]{12}$/);
    expect(first).not.toContain("Users");
  });

  it("distinguishes finding direction when presence changes sides", () => {
    const left = createFindingId({
      category: "skill",
      type: "capability-gap",
      logicalKey: "deploy",
      aspect: "presence",
      direction: "left",
    });
    const right = createFindingId({
      category: "skill",
      type: "capability-gap",
      logicalKey: "deploy",
      aspect: "presence",
      direction: "right",
    });
    expect(left).not.toBe(right);
  });

  it("sorts by category, severity, and ID without mutating input", () => {
    const input = [
      finding("skill:info:z", "skill", "info"),
      finding("mcp:medium:a", "mcp", "medium"),
      finding("instruction:low:b", "instruction", "low"),
      finding("instruction:medium:c", "instruction", "medium"),
      finding("instruction:medium:a", "instruction", "medium"),
    ];
    const before = [...input];
    expect(sortFindings(input).map((item) => item.id)).toEqual([
      "instruction:medium:a",
      "instruction:medium:c",
      "instruction:low:b",
      "skill:info:z",
      "mcp:medium:a",
    ]);
    expect(input).toEqual(before);
  });

  it("counts severities and logical entity states with divergent precedence", () => {
    const findings = [
      finding("one", "instruction", "medium", "missing"),
      finding("two", "skill", "info", "unknown"),
      finding("three", "skill", "info", "informational"),
    ];
    const summary = buildSummary(findings, [
      { category: "instruction", key: "root", status: "divergent" },
      { category: "skill", key: "review", status: "unknown" },
      { category: "skill", key: "review", status: "divergent" },
      { category: "mcp", key: "database", status: "equivalent" },
    ]);
    expect(summary.counts).toEqual({ high: 0, medium: 1, low: 0, info: 2 });
    expect(summary.byCategory).toEqual({
      instruction: { equivalent: 0, divergent: 1, unknown: 0 },
      skill: { equivalent: 0, divergent: 1, unknown: 0 },
      mcp: { equivalent: 1, divergent: 0, unknown: 0 },
    });
  });

  it("creates bounded instruction evidence", () => {
    const instruction: EffectiveInstruction = {
      id: "instruction",
      content: `${"a".repeat(220)}\n`,
      source,
      scope: { appliesTo: ["."] },
    };
    const evidence = instructionEvidence(instruction, "Left instruction");
    expect(evidence.excerpt?.length).toBeLessThanOrEqual(180);
    expect(evidence.reason).toBe("Left instruction");
    expect(shortExcerpt("line\r\n")).toBe("line");
  });

  it("creates MCP evidence without command, argument, URL, or environment values", () => {
    const server: EffectiveMcpServer = {
      id: "mcp",
      name: "database",
      transport: "stdio",
      command: "secret-command",
      args: ["--token", "must-not-appear"],
      url: "https://secret.example/token",
      environment: [
        {
          name: "API_KEY",
          value: { kind: "configured", redacted: true },
          source,
        },
      ],
      source,
      capabilities: { known: false },
    };
    const evidence = mcpEvidence(server, "Configured server");
    const serialized = JSON.stringify(evidence);
    expect(serialized).not.toContain("must-not-appear");
    expect(serialized).not.toContain("secret-command");
    expect(serialized).not.toContain("secret.example");
    expect(serialized).toContain("environment");
  });
});
