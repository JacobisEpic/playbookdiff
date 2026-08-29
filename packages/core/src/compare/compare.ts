import type { CompatibilityReport, EffectiveAgentConfig } from "../types/index.js";
import { compareInstructions } from "./instructions.js";
import { compareMcpServers } from "./mcp.js";
import { compareSkills } from "./skills.js";
import { sortFindings } from "./sort.js";
import { buildSummary } from "./summary.js";

/**
 * Compares two already-normalized effective configurations without I/O or mutation.
 */
export function compareEffectiveConfigs(
  left: EffectiveAgentConfig,
  right: EffectiveAgentConfig,
): CompatibilityReport {
  const categoryResults = [
    compareInstructions(left, right),
    compareSkills(left, right),
    compareMcpServers(left, right),
  ];
  const findings = sortFindings(categoryResults.flatMap((result) => result.findings));
  const entities = categoryResults.flatMap((result) => result.entities);

  return {
    left,
    right,
    findings,
    summary: buildSummary(findings, entities),
  };
}
