import type {
  EffectiveInstruction,
  EffectiveMcpServer,
  EffectiveSkill,
  Evidence,
} from "../types/index.js";

const MAX_EXCERPT_CHARS = 180;

export function shortExcerpt(value: string): string {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (normalized.length <= MAX_EXCERPT_CHARS) return normalized;
  return `${normalized.slice(0, MAX_EXCERPT_CHARS - 1)}…`;
}

export function instructionEvidence(instruction: EffectiveInstruction, reason: string): Evidence {
  return {
    source: instruction.source,
    excerpt: shortExcerpt(instruction.content),
    reason,
  };
}

export function skillEvidence(skill: EffectiveSkill, reason: string): Evidence {
  const description = skill.description ? `: ${shortExcerpt(skill.description)}` : "";
  return {
    source: skill.source,
    excerpt: `${skill.name}${description}`,
    reason,
  };
}

export function mcpEvidence(server: EffectiveMcpServer, reason: string): Evidence {
  const configuredFields = [
    server.transport !== undefined ? "transport" : undefined,
    server.command !== undefined ? "command" : undefined,
    server.args !== undefined ? "args" : undefined,
    server.url !== undefined ? "url" : undefined,
    server.environment !== undefined ? "environment" : undefined,
  ].filter((field): field is string => field !== undefined);
  return {
    source: server.source,
    excerpt: `MCP server ${server.name}; configured fields: ${configuredFields.join(", ") || "none"}`,
    reason,
  };
}
