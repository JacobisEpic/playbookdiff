import path from "node:path";
import { describe, expect, it } from "vitest";
import { compileCodexConfig } from "./compile.js";

const fixtures = path.join(import.meta.dirname, "..", "test", "fixtures", "mcp");

describe("Codex MCP discovery", () => {
  it("normalizes stdio and HTTP servers without connecting", async () => {
    const repositoryRoot = path.join(fixtures, "basic");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    expect(config.mcpServers).toHaveLength(2);
    expect(config.mcpServers.find((server) => server.name === "local")).toMatchObject({
      transport: "stdio",
      command: "node",
      args: ["server.js", "${API_TOKEN}"],
      capabilities: { known: false },
    });
    expect(config.mcpServers.find((server) => server.name === "remote")).toMatchObject({
      transport: "http",
      url: "https://example.test/mcp",
      capabilities: { known: false },
    });
    expect(
      config.diagnostics.filter((diagnostic) => diagnostic.code === "runtime-unknown"),
    ).toHaveLength(2);
  });

  it("preserves symbolic and host environment references while redacting configured values", async () => {
    const repositoryRoot = path.join(fixtures, "basic");
    const config = await compileCodexConfig({ repositoryRoot, cwd: repositoryRoot, mode: "repo" });
    const local = config.mcpServers.find((server) => server.name === "local");
    expect(local?.environment).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "API_TOKEN",
          value: { kind: "symbolic", expression: "${API_TOKEN}" },
        }),
        expect.objectContaining({
          name: "INLINE_SECRET",
          value: { kind: "configured", redacted: true },
        }),
        expect.objectContaining({
          name: "HOST_TOKEN",
          value: { kind: "host", variable: "HOST_TOKEN" },
        }),
      ]),
    );
    expect(JSON.stringify(config)).not.toContain("must-not-appear");
  });

  it("preserves duplicate cross-layer sources and leaves merge behavior unresolved", async () => {
    const repositoryRoot = path.join(fixtures, "duplicate");
    const config = await compileCodexConfig({
      repositoryRoot,
      cwd: path.join(repositoryRoot, "apps", "api"),
      mode: "repo",
    });
    expect(config.mcpServers[0]).toMatchObject({ name: "shared", transport: "unknown" });
    expect(config.mcpServers[0]).not.toHaveProperty("command");
    const provenance = config.provenance.find(
      (record) => record.effectiveId === config.mcpServers[0]?.id,
    );
    expect(provenance?.sources.map((source) => source.path)).toEqual([
      ".codex/config.toml",
      "apps/api/.codex/config.toml",
    ]);
    expect(provenance?.resolution?.strategy).toBe("unknown");
    expect(config.diagnostics).toContainEqual(expect.objectContaining({ code: "unresolved" }));
  });
});
