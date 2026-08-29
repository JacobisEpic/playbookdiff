import { describe, expect, it } from "vitest";
import type {
  EffectiveAgentConfig,
  EffectiveMcpServer,
  HarnessId,
  McpEnvironmentVariable,
} from "../types/index.js";
import { compareMcpServers } from "./mcp.js";

const claudeSource = { path: ".mcp.json", scope: "repository" as const, format: "json" };
const codexSource = {
  path: ".codex/config.toml",
  scope: "repository" as const,
  format: "toml",
};

function server(
  id: string,
  source: typeof claudeSource,
  overrides: Partial<EffectiveMcpServer> = {},
): EffectiveMcpServer {
  return {
    id,
    name: "database",
    transport: "stdio",
    command: "database-server",
    args: ["--safe"],
    source,
    capabilities: { known: false },
    ...overrides,
  };
}

function httpServer(id: string, source: typeof claudeSource, url: string): EffectiveMcpServer {
  return {
    id,
    name: "database",
    transport: "http",
    url,
    source,
    capabilities: { known: false },
  };
}

function config(harness: HarnessId, servers: EffectiveMcpServer[]): EffectiveAgentConfig {
  return {
    harness,
    target: { repositoryRoot: ".", cwd: ".", mode: "repo" },
    instructions: [],
    skills: [],
    mcpServers: servers,
    provenance: [],
    diagnostics: [],
    assumptions: [],
  };
}

function environment(name: string, value: McpEnvironmentVariable["value"]): McpEnvironmentVariable {
  return { name, value, source: claudeSource };
}

function compare(left: EffectiveMcpServer, right: EffectiveMcpServer) {
  return compareMcpServers(config("claude", [left]), config("codex", [right]));
}

describe("deterministic MCP comparison", () => {
  it("treats equivalent normalized servers in different native formats as equivalent", () => {
    const result = compare(server("left", claudeSource), server("right", codexSource));
    expect(result.findings).toEqual([]);
    expect(result.entities[0]?.status).toBe("equivalent");
  });

  it("reports a missing server as a medium capability gap", () => {
    const result = compareMcpServers(
      config("claude", [server("left", claudeSource)]),
      config("codex", []),
    );
    expect(result.findings[0]).toMatchObject({
      type: "capability-gap",
      severity: "medium",
      left: { present: true },
      right: { present: false },
    });
  });

  it.each([
    [
      "transport",
      server("left", claudeSource),
      httpServer("right", codexSource, "https://example.test"),
    ],
    [
      "command",
      server("left", claudeSource),
      server("right", codexSource, { command: "other-server" }),
    ],
    ["args", server("left", claudeSource), server("right", codexSource, { args: ["--different"] })],
    [
      "url",
      httpServer("left", claudeSource, "https://two.test"),
      httpServer("right", codexSource, "https://one.test"),
    ],
  ])("reports a known %s difference as medium", (_field, left, right) => {
    const result = compare(left, right);
    expect(result.findings).toContainEqual(
      expect.objectContaining({ type: "different", severity: "medium" }),
    );
  });

  it("treats the same host environment reference as equivalent", () => {
    const env = [environment("API_KEY", { kind: "host", variable: "OPENAI_API_KEY" })];
    const result = compare(
      server("left", claudeSource, { environment: env }),
      server("right", codexSource, { environment: env }),
    );
    expect(result.findings).toEqual([]);
  });

  it("reports different host variable names", () => {
    const result = compare(
      server("left", claudeSource, {
        environment: [environment("API_KEY", { kind: "host", variable: "LEFT_KEY" })],
      }),
      server("right", codexSource, {
        environment: [environment("API_KEY", { kind: "host", variable: "RIGHT_KEY" })],
      }),
    );
    expect(result.findings).toContainEqual(expect.objectContaining({ type: "different" }));
  });

  it("treats the same symbolic expression as equivalent", () => {
    const env = [environment("API_KEY", { kind: "symbolic", expression: "${API_KEY}" })];
    const result = compare(
      server("left", claudeSource, { environment: env }),
      server("right", codexSource, { environment: env }),
    );
    expect(result.findings).toEqual([]);
  });

  it("reports different symbolic expressions", () => {
    const result = compare(
      server("left", claudeSource, {
        environment: [environment("API_KEY", { kind: "symbolic", expression: "${LEFT}" })],
      }),
      server("right", codexSource, {
        environment: [environment("API_KEY", { kind: "symbolic", expression: "${RIGHT}" })],
      }),
    );
    expect(result.findings).toContainEqual(expect.objectContaining({ type: "different" }));
  });

  it("reports two configured redacted values as unknown without exposing values", () => {
    const env = [environment("API_KEY", { kind: "configured", redacted: true })];
    const result = compare(
      server("left", claudeSource, { environment: env }),
      server("right", codexSource, { environment: env }),
    );
    expect(result.findings).toEqual([expect.objectContaining({ type: "unknown" })]);
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("reports configured versus host environment as structurally different", () => {
    const result = compare(
      server("left", claudeSource, {
        environment: [environment("API_KEY", { kind: "configured", redacted: true })],
      }),
      server("right", codexSource, {
        environment: [environment("API_KEY", { kind: "host", variable: "API_KEY" })],
      }),
    );
    expect(result.findings).toContainEqual(expect.objectContaining({ type: "different" }));
  });

  it("does not create noise when both runtime capability sets are unknown", () => {
    const result = compare(server("left", claudeSource), server("right", codexSource));
    expect(result.findings).toEqual([]);
  });

  it("reports one known and one unknown capability set as unknown", () => {
    const result = compare(
      server("left", claudeSource, { capabilities: { known: true, tools: ["query"] } }),
      server("right", codexSource),
    );
    expect(result.findings).toContainEqual(expect.objectContaining({ type: "unknown" }));
  });

  it("compares known capabilities as sets", () => {
    const result = compare(
      server("left", claudeSource, {
        capabilities: { known: true, tools: ["query", "write"] },
      }),
      server("right", codexSource, {
        capabilities: { known: true, tools: ["query"] },
      }),
    );
    expect(result.findings).toContainEqual(
      expect.objectContaining({ type: "capability-gap", severity: "medium" }),
    );
  });

  it("keeps finding IDs stable when the current differing URL changes", () => {
    const left = httpServer("left", claudeSource, "https://left.test");
    const first = compare(left, httpServer("right", codexSource, "https://right-one.test"));
    const second = compare(left, httpServer("right", codexSource, "https://right-two.test"));
    expect(second.findings[0]?.id).toBe(first.findings[0]?.id);
  });
});
