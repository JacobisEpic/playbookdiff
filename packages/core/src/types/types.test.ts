import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  AnalysisContext,
  CompatibilityReport,
  Diagnostic,
  EffectiveAgentConfig,
  EffectiveInstruction,
  EffectiveMcpServer,
  EffectiveSkill,
  ProvenanceRecord,
  SourceRef,
} from "../index.js";

const repositorySource = {
  path: "AGENTS.md",
  lineStart: 1,
  lineEnd: 4,
  scope: "repository",
  format: "markdown",
} satisfies SourceRef;

const context = {
  repositoryRoot: ".",
  cwd: "apps/api",
  targetPath: "apps/api/src/users.ts",
  mode: "repo",
} satisfies AnalysisContext;

const instruction = {
  id: "codex:instruction:AGENTS.md",
  content: "Preserve this text exactly.\n",
  source: repositorySource,
  scope: { appliesTo: ["."] },
  loadPhase: "startup",
  order: 0,
} satisfies EffectiveInstruction;

const skill = {
  id: "codex:skill:review:.agents/skills/review/SKILL.md",
  name: "review",
  path: ".agents/skills/review/SKILL.md",
  source: repositorySource,
  discovery: { state: "available" },
  invocation: { explicit: "allowed", implicit: "unknown" },
  advertisement: {
    state: "budget-risk",
    aggregateBudget: { maxContextFraction: 0.02, fallbackChars: 8_000 },
  },
} satisfies EffectiveSkill;

const mcpServer = {
  id: "codex:mcp:example",
  name: "example",
  transport: "stdio",
  command: "example-server",
  args: ["--token", "${API_TOKEN}"],
  environment: [
    {
      name: "API_TOKEN",
      value: { kind: "host", variable: "API_TOKEN" },
      source: repositorySource,
    },
    {
      name: "INLINE_SECRET",
      value: { kind: "configured", redacted: true },
      source: repositorySource,
    },
  ],
  source: repositorySource,
  capabilities: { known: false },
} satisfies EffectiveMcpServer;

const diagnostic = {
  id: "codex:runtime-state-unknown:example",
  level: "info",
  code: "runtime-unknown",
  message: "Repository configuration cannot prove runtime connectivity.",
  source: repositorySource,
} satisfies Diagnostic;

const provenance = {
  effectiveId: instruction.id,
  sources: [repositorySource],
  resolution: { strategy: "inherited" },
} satisfies ProvenanceRecord;

const config = {
  harness: "codex",
  target: context,
  instructions: [instruction],
  skills: [skill],
  mcpServers: [mcpServer],
  provenance: [provenance],
  diagnostics: [diagnostic],
  assumptions: ["Project configuration is trusted."],
} satisfies EffectiveAgentConfig;

const report = {
  left: config,
  right: { ...config, harness: "claude" },
  findings: [],
  summary: {
    counts: { high: 0, medium: 0, low: 0, info: 0 },
    byCategory: {
      instruction: { equivalent: 1, divergent: 0, unknown: 0 },
    },
  },
} satisfies CompatibilityReport;

describe("shared type contracts", () => {
  it("keeps launch and target paths independent", () => {
    expect(context.cwd).not.toBe(context.targetPath);
    expectTypeOf(context.mode).toEqualTypeOf<"repo">();
  });

  it("preserves symbolic MCP environment references", () => {
    expect(report.left.mcpServers[0]?.args).toContain("${API_TOKEN}");
    expect(report.left.mcpServers[0]?.environment?.[0]?.value).toEqual({
      kind: "host",
      variable: "API_TOKEN",
    });
    expect(report.left.mcpServers[0]?.environment?.[1]?.value).toEqual({
      kind: "configured",
      redacted: true,
    });
  });

  it("models skill discovery, invocation, and advertisement separately", () => {
    expect(skill.discovery.state).toBe("available");
    expect(skill.invocation.implicit).toBe("unknown");
    expect(skill.advertisement.state).toBe("budget-risk");
  });

  it("has the expected public report type", () => {
    expectTypeOf(report).toMatchTypeOf<CompatibilityReport>();
    expect(report.summary.counts.high).toBe(0);
  });
});
