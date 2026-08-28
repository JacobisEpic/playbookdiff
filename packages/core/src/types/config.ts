import type { AnalysisContext } from "./context.js";
import type { Diagnostic } from "./diagnostic.js";
import type { EffectiveInstruction } from "./instruction.js";
import type { EffectiveMcpServer } from "./mcp.js";
import type { ProvenanceRecord } from "./provenance.js";
import type { EffectiveSkill } from "./skill.js";

export type HarnessId = "claude" | "codex";

export type EffectiveAgentConfig = {
  harness: HarnessId;
  target: AnalysisContext;
  instructions: EffectiveInstruction[];
  skills: EffectiveSkill[];
  mcpServers: EffectiveMcpServer[];
  provenance: ProvenanceRecord[];
  diagnostics: Diagnostic[];
  assumptions: string[];
};
