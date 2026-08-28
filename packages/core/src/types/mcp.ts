import type { SourceRef } from "./source.js";

export type McpTransport = "stdio" | "http" | "unknown";

/** Describes repository-configured MCP state, not a verified runtime connection. */
export type EffectiveMcpServer = {
  id: string;
  name: string;
  transport?: McpTransport;
  command?: string;
  args?: string[];
  url?: string;
  source: SourceRef;
  capabilities?: {
    known: boolean;
    tools?: string[];
    resources?: string[];
    prompts?: string[];
  };
};
