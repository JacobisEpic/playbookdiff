import type {
  Diagnostic,
  EffectiveMcpServer,
  McpEnvironmentVariable,
  ProvenanceRecord,
  SourceRef,
} from "@playbookdiff/core/types";
import type { CodexConfig, CodexConfigLayer } from "./config.js";
import { configValueAt, isRecord, sourceForConfigPath } from "./config.js";
import { createDiagnostic, type IdRegistry } from "./diagnostics.js";

export type McpDiscoveryResult = {
  mcpServers: EffectiveMcpServer[];
  provenance: ProvenanceRecord[];
  diagnostics: Diagnostic[];
};

type ServerCandidate = {
  name: string;
  value: Record<string, unknown>;
  layer: CodexConfigLayer;
  source: SourceRef;
};

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) return undefined;
  return value;
}

function environmentValue(raw: unknown): McpEnvironmentVariable["value"] {
  return typeof raw === "string" && /^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/.test(raw)
    ? { kind: "symbolic", expression: raw }
    : { kind: "configured", redacted: true };
}

function readEnvironment(candidate: ServerCandidate): McpEnvironmentVariable[] | undefined {
  const result: McpEnvironmentVariable[] = [];
  const env = candidate.value.env;
  if (isRecord(env)) {
    for (const [name, value] of Object.entries(env)) {
      result.push({
        name,
        value: environmentValue(value),
        source: sourceForConfigPath(candidate.layer, ["mcp_servers", candidate.name, "env", name]),
      });
    }
  }
  const envVars = stringArray(candidate.value.env_vars);
  if (envVars) {
    const source = sourceForConfigPath(candidate.layer, [
      "mcp_servers",
      candidate.name,
      "env_vars",
    ]);
    for (const variable of envVars) {
      result.push({ name: variable, value: { kind: "host", variable }, source });
    }
  }
  const bearerToken = candidate.value.bearer_token_env_var;
  if (typeof bearerToken === "string") {
    result.push({
      name: bearerToken,
      value: { kind: "host", variable: bearerToken },
      source: sourceForConfigPath(candidate.layer, [
        "mcp_servers",
        candidate.name,
        "bearer_token_env_var",
      ]),
    });
  }
  const envHttpHeaders = candidate.value.env_http_headers;
  if (isRecord(envHttpHeaders)) {
    for (const variable of Object.values(envHttpHeaders)) {
      if (typeof variable !== "string") continue;
      result.push({
        name: variable,
        value: { kind: "host", variable },
        source: sourceForConfigPath(candidate.layer, [
          "mcp_servers",
          candidate.name,
          "env_http_headers",
        ]),
      });
    }
  }
  const deduplicated = new Map<string, McpEnvironmentVariable>();
  for (const variable of result) deduplicated.set(variable.name, variable);
  return deduplicated.size > 0 ? [...deduplicated.values()] : undefined;
}

function collectCandidates(config: CodexConfig): Map<string, ServerCandidate[]> {
  const result = new Map<string, ServerCandidate[]>();
  for (const layer of config.layers) {
    const servers = configValueAt(layer, ["mcp_servers"]);
    if (!isRecord(servers)) continue;
    for (const [name, value] of Object.entries(servers)) {
      if (!isRecord(value)) continue;
      const candidate: ServerCandidate = {
        name,
        value,
        layer,
        source: sourceForConfigPath(layer, ["mcp_servers", name]),
      };
      const current = result.get(name) ?? [];
      current.push(candidate);
      result.set(name, current);
    }
  }
  return result;
}

export function discoverMcpServers(config: CodexConfig, registry: IdRegistry): McpDiscoveryResult {
  const mcpServers: EffectiveMcpServer[] = [];
  const provenance: ProvenanceRecord[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const [name, candidates] of collectCandidates(config)) {
    const id = registry.unique(`codex:mcp:${name}`);
    const nearest = candidates.at(-1);
    if (!nearest) continue;
    if (candidates.length > 1) {
      mcpServers.push({
        id,
        name,
        transport: "unknown",
        source: nearest.source,
        capabilities: { known: false },
      });
      provenance.push({
        effectiveId: id,
        sources: candidates.map((candidate) => candidate.source),
        resolution: { strategy: "unknown" },
      });
      diagnostics.push(
        createDiagnostic(registry, {
          level: "warning",
          code: "unresolved",
          slug: `mcp-duplicate:${name}`,
          message: `MCP server "${name}" is declared in multiple applicable project config layers. Official documentation does not define table merge behavior across those layers, so both sources are preserved without guessing effective fields.`,
          source: nearest.source,
        }),
      );
      continue;
    }

    const command = typeof nearest.value.command === "string" ? nearest.value.command : undefined;
    const args = stringArray(nearest.value.args);
    const url = typeof nearest.value.url === "string" ? nearest.value.url : undefined;
    const environment = readEnvironment(nearest);
    let transport: "stdio" | "http" | "unknown";
    if (command !== undefined && url === undefined) transport = "stdio";
    else if (url !== undefined && command === undefined) transport = "http";
    else {
      transport = "unknown";
      diagnostics.push(
        createDiagnostic(registry, {
          level: "warning",
          code: "parse-error",
          slug: `mcp-shape:${name}`,
          message:
            command !== undefined
              ? `MCP server "${name}" declares both command and url, so its transport is ambiguous.`
              : `MCP server "${name}" declares neither command nor url, so its transport is unknown.`,
          source: nearest.source,
        }),
      );
    }
    mcpServers.push({
      id,
      name,
      transport,
      source: nearest.source,
      capabilities: { known: false },
      ...(command !== undefined ? { command } : {}),
      ...(args !== undefined ? { args } : {}),
      ...(url !== undefined ? { url } : {}),
      ...(environment !== undefined ? { environment } : {}),
    });
    provenance.push({
      effectiveId: id,
      sources: [nearest.source],
      resolution: { strategy: "matched" },
    });
    diagnostics.push(
      createDiagnostic(registry, {
        level: "info",
        code: "runtime-unknown",
        slug: `mcp-runtime:${name}`,
        message: `MCP server "${name}" is configured, but repository analysis cannot prove runtime connectivity or enumerate negotiated capabilities.`,
        source: nearest.source,
      }),
    );
  }

  return { mcpServers, provenance, diagnostics };
}
