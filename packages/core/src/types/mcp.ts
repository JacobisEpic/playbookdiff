import type { SourceRef } from "./source.js";

export type McpTransport = "stdio" | "http" | "unknown";

export type McpEnvironmentValue =
  | { kind: "host"; variable: string }
  | { kind: "symbolic"; expression: string }
  | { kind: "configured"; redacted: true };

export type McpEnvironmentVariable = {
  name: string;
  value: McpEnvironmentValue;
  source: SourceRef;
};

/** Describes repository-configured MCP state, not a verified runtime connection. */
export type EffectiveMcpServer = {
  id: string;
  name: string;
  transport?: McpTransport;
  command?: string;
  args?: string[];
  url?: string;
  environment?: McpEnvironmentVariable[];
  source: SourceRef;
  capabilities?: {
    known: boolean;
    tools?: string[];
    resources?: string[];
    prompts?: string[];
  };
};
