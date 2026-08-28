import path from "node:path";
import type {
  Diagnostic,
  EffectiveMcpServer,
  McpTransport,
  ProvenanceRecord,
  SourceRef,
} from "@playbookdiff/core/types";
import { createDiagnostic, type IdRegistry } from "./diagnostics.js";
import { readFileIfExists, type ValidatedContext } from "./paths.js";

export type McpDiscoveryResult = {
  mcpServers: EffectiveMcpServer[];
  provenance: ProvenanceRecord[];
  diagnostics: Diagnostic[];
};

type RawServerEntry = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const strings = value.filter((entry): entry is string => typeof entry === "string");
  return strings.length > 0 ? strings : undefined;
}

/**
 * `.mcp.json` lives at the repository root only - not searched up an
 * ancestor chain like CLAUDE.md/rules/skills. Confirmed by the official
 * troubleshooting table: "Project MCP config goes at the repository root as
 * .mcp.json, not inside .claude/".
 */
export async function discoverMcpServers(
  ctx: ValidatedContext,
  registry: IdRegistry,
): Promise<McpDiscoveryResult> {
  const mcpServers: EffectiveMcpServer[] = [];
  const provenance: ProvenanceRecord[] = [];
  const diagnostics: Diagnostic[] = [];

  const mcpJsonPath = path.join(ctx.repositoryRoot, ".mcp.json");
  const source: SourceRef = { path: ".mcp.json", scope: "repository", format: "json" };
  const raw = await readFileIfExists(mcpJsonPath);
  if (raw === undefined) {
    return { mcpServers, provenance, diagnostics };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    diagnostics.push(
      createDiagnostic(registry, {
        level: "warning",
        code: "parse-error",
        slug: "mcp-json",
        message: ".mcp.json is not valid JSON; project MCP configuration could not be read.",
        source,
      }),
    );
    return { mcpServers, provenance, diagnostics };
  }

  const serversValue = isRecord(parsed) ? parsed.mcpServers : undefined;
  if (!isRecord(serversValue)) {
    return { mcpServers, provenance, diagnostics };
  }

  for (const [name, entryValue] of Object.entries(serversValue)) {
    if (!isRecord(entryValue)) {
      diagnostics.push(
        createDiagnostic(registry, {
          level: "warning",
          code: "parse-error",
          slug: `mcp-entry:${name}`,
          message: `MCP server "${name}" is not a JSON object and was skipped.`,
          source,
        }),
      );
      continue;
    }
    const entry: RawServerEntry = entryValue;
    const id = `claude:mcp:${name}`;

    const command = typeof entry.command === "string" ? entry.command : undefined;
    const args = readStringArray(entry.args);
    const url = typeof entry.url === "string" ? entry.url : undefined;
    const explicitType = typeof entry.type === "string" ? entry.type.toLowerCase() : undefined;

    let transport: McpTransport = "unknown";
    if (command !== undefined) {
      transport = "stdio";
    } else if (url !== undefined) {
      if (
        explicitType === undefined ||
        explicitType === "http" ||
        explicitType === "streamable-http"
      ) {
        transport = "http";
      } else {
        transport = "unknown";
        diagnostics.push(
          createDiagnostic(registry, {
            level: "info",
            code: "unsupported",
            slug: `mcp-transport:${name}`,
            message: `MCP server "${name}" declares transport type "${explicitType}", which the current shared McpTransport contract does not represent (only stdio and http are supported). It is recorded as "unknown" rather than mislabeled.`,
            source,
          }),
        );
      }
    } else {
      diagnostics.push(
        createDiagnostic(registry, {
          level: "warning",
          code: "parse-error",
          slug: `mcp-shape:${name}`,
          message: `MCP server "${name}" has neither a command nor a url and could not be classified.`,
          source,
        }),
      );
    }

    if (isRecord(entry.env)) {
      diagnostics.push(
        createDiagnostic(registry, {
          level: "info",
          code: "unsupported",
          slug: `mcp-env:${name}`,
          message: `MCP server "${name}" declares a dedicated env map, which the current shared EffectiveMcpServer contract has no field for. Environment placeholders embedded directly in args are still preserved symbolically; this server's env map is not represented.`,
          source,
        }),
      );
    }

    const server: EffectiveMcpServer = {
      id,
      name,
      transport,
      source,
      capabilities: { known: false },
      ...(command !== undefined ? { command } : {}),
      ...(args !== undefined ? { args } : {}),
      ...(url !== undefined ? { url } : {}),
    };
    mcpServers.push(server);
    provenance.push({ effectiveId: id, sources: [source], resolution: { strategy: "matched" } });
  }

  return { mcpServers, provenance, diagnostics };
}
