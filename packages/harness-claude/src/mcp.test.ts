import path from "node:path";
import { describe, expect, it } from "vitest";
import { IdRegistry } from "./diagnostics.js";
import { discoverMcpServers } from "./mcp.js";
import { validateAnalysisContext } from "./paths.js";

const fixturesRoot = path.join(import.meta.dirname, "..", "test", "fixtures", "mcp");

async function discover(repositoryRoot: string) {
  const ctx = await validateAnalysisContext({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
  return discoverMcpServers(ctx, new IdRegistry());
}

describe("stdio servers", () => {
  it("compiles a stdio server without connecting to it", async () => {
    const result = await discover(path.join(fixturesRoot, "stdio-server"));
    expect(result.mcpServers).toHaveLength(1);
    const server = result.mcpServers[0]!;
    expect(server.name).toBe("example");
    expect(server.transport).toBe("stdio");
    expect(server.command).toBe("npx");
    expect(server.args).toEqual(["-y", "example-mcp-server"]);
    expect(server.capabilities).toEqual({ known: false });
  });
});

describe("http servers", () => {
  it("compiles an http server from a url-only entry", async () => {
    const result = await discover(path.join(fixturesRoot, "http-server"));
    const server = result.mcpServers[0]!;
    expect(server.transport).toBe("http");
    expect(server.url).toBe("https://example.test/mcp");
    expect(server.command).toBeUndefined();
  });
});

describe("multiple servers", () => {
  it("compiles every configured server independently", async () => {
    const result = await discover(path.join(fixturesRoot, "multiple-servers"));
    expect(result.mcpServers).toHaveLength(2);
    const names = result.mcpServers.map((s) => s.name).sort();
    expect(names).toEqual(["alpha", "beta"]);
  });
});

describe("symbolic environment references", () => {
  it("preserves ${VAR} and ${VAR:-default} placeholders in args verbatim", async () => {
    const result = await discover(path.join(fixturesRoot, "env-placeholder"));
    const server = result.mcpServers[0]!;
    expect(server.args).toContain("${API_TOKEN}");
    expect(server.args).toContain("${API_ENDPOINT:-https://default.test}");
  });

  it("normalizes a dedicated env map without serializing configured literal values", async () => {
    const result = await discover(path.join(fixturesRoot, "env-map"));
    expect(result.mcpServers).toHaveLength(1);
    expect(result.mcpServers[0]?.environment).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "API_KEY",
          value: { kind: "symbolic", expression: "${API_KEY}" },
        }),
        expect.objectContaining({
          name: "INLINE_SECRET",
          value: { kind: "configured", redacted: true },
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("must-not-appear");
  });
});

describe("unsupported transports", () => {
  it("labels an unrecognized transport type unknown with a diagnostic instead of mislabeling it", async () => {
    const result = await discover(path.join(fixturesRoot, "unsupported-transport"));
    const server = result.mcpServers[0]!;
    expect(server.transport).toBe("unknown");
    const diagnostic = result.diagnostics.find((d) => d.code === "unsupported");
    expect(diagnostic).toBeDefined();
  });
});

describe("malformed .mcp.json", () => {
  it("emits a parse-error diagnostic instead of throwing", async () => {
    const result = await discover(path.join(fixturesRoot, "malformed"));
    expect(result.mcpServers).toHaveLength(0);
    const diagnostic = result.diagnostics.find((d) => d.code === "parse-error");
    expect(diagnostic).toBeDefined();
  });
});

describe("no .mcp.json", () => {
  it("returns no servers and no diagnostics when the file is absent", async () => {
    const result = await discover(fixturesRoot);
    expect(result.mcpServers).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(0);
  });
});
