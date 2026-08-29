import type {
  CompatibilityFinding,
  EffectiveAgentConfig,
  EffectiveMcpServer,
  HarnessId,
  McpEnvironmentVariable,
} from "../types/index.js";
import { mcpEvidence } from "./evidence.js";
import { createFindingId } from "./ids.js";
import type { CategoryComparisonResult, ComparedEntity, EntityStatus } from "./model.js";
import { sortFindings } from "./sort.js";

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function harnessLabel(harness: HarnessId): string {
  return harness === "claude" ? "Claude Code" : "Codex";
}

function groupServers(servers: readonly EffectiveMcpServer[]): Map<string, EffectiveMcpServer[]> {
  const groups = new Map<string, EffectiveMcpServer[]>();
  for (const server of servers) {
    const current = groups.get(server.name) ?? [];
    current.push(server);
    groups.set(server.name, current);
  }
  for (const group of groups.values()) {
    group.sort(
      (left, right) =>
        compareText(left.source.path, right.source.path) || compareText(left.id, right.id),
    );
  }
  return groups;
}

function allKeys(left: Map<string, unknown>, right: Map<string, unknown>): string[] {
  return [...new Set([...left.keys(), ...right.keys()])].sort(compareText);
}

function pairEvidence(
  left: EffectiveMcpServer,
  right: EffectiveMcpServer,
  leftHarness: HarnessId,
  rightHarness: HarnessId,
): ReturnType<typeof mcpEvidence>[] {
  return [
    mcpEvidence(left, `${harnessLabel(leftHarness)} MCP server`),
    mcpEvidence(right, `${harnessLabel(rightHarness)} MCP server`),
  ];
}

function missingServerFinding(
  name: string,
  server: EffectiveMcpServer,
  existingSide: "left" | "right",
  leftHarness: HarnessId,
  rightHarness: HarnessId,
): CompatibilityFinding {
  const missingSide = existingSide === "left" ? "right" : "left";
  const existingHarness = existingSide === "left" ? leftHarness : rightHarness;
  const missingHarness = existingSide === "left" ? rightHarness : leftHarness;
  return {
    id: createFindingId({
      category: "mcp",
      type: "capability-gap",
      logicalKey: name,
      aspect: "presence",
      direction: missingSide,
    }),
    category: "mcp",
    type: "capability-gap",
    severity: "medium",
    confidence: "deterministic",
    left: { present: existingSide === "left" },
    right: { present: existingSide === "right" },
    explanation: `The ${name} MCP server is repository-configured only for ${harnessLabel(existingHarness)}, not ${harnessLabel(missingHarness)}.`,
    evidence: [mcpEvidence(server, `${harnessLabel(existingHarness)} configured server`)],
  };
}

function ambiguousServerFinding(
  name: string,
  left: readonly EffectiveMcpServer[],
  right: readonly EffectiveMcpServer[],
  leftHarness: HarnessId,
  rightHarness: HarnessId,
): CompatibilityFinding {
  return {
    id: createFindingId({
      category: "mcp",
      type: "unknown",
      logicalKey: name,
      aspect: "duplicate-pairing",
    }),
    category: "mcp",
    type: "unknown",
    severity: "info",
    confidence: "deterministic",
    left: { present: true, detail: `${left.length} candidate(s)` },
    right: { present: true, detail: `${right.length} candidate(s)` },
    explanation: `Multiple ${name} MCP server entries cannot be paired unambiguously between ${harnessLabel(leftHarness)} and ${harnessLabel(rightHarness)}.`,
    evidence: [
      ...left
        .slice(0, 3)
        .map((server) => mcpEvidence(server, `${harnessLabel(leftHarness)} candidate`)),
      ...right
        .slice(0, 3)
        .map((server) => mcpEvidence(server, `${harnessLabel(rightHarness)} candidate`)),
    ],
  };
}

function equalOptionalArray(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined,
): boolean {
  if (left === undefined || right === undefined) return left === right;
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function configDifferences(left: EffectiveMcpServer, right: EffectiveMcpServer): string[] {
  const fields: string[] = [];
  if (left.transport !== right.transport) fields.push("transport");
  if (left.command !== right.command) fields.push("command");
  if (!equalOptionalArray(left.args, right.args)) fields.push("args");
  if (left.url !== right.url) fields.push("url");
  return fields;
}

function environmentMap(
  environment: readonly McpEnvironmentVariable[] | undefined,
): Map<string, McpEnvironmentVariable> | undefined {
  const result = new Map<string, McpEnvironmentVariable>();
  for (const variable of environment ?? []) {
    if (result.has(variable.name)) return undefined;
    result.set(variable.name, variable);
  }
  return result;
}

function environmentComparison(
  left: EffectiveMcpServer,
  right: EffectiveMcpServer,
): { different: string[]; unknown: string[] } {
  const leftMap = environmentMap(left.environment);
  const rightMap = environmentMap(right.environment);
  if (!leftMap || !rightMap) return { different: [], unknown: ["duplicate variable names"] };
  const different: string[] = [];
  const unknown: string[] = [];
  for (const name of allKeys(leftMap, rightMap)) {
    const leftVariable = leftMap.get(name);
    const rightVariable = rightMap.get(name);
    if (!leftVariable || !rightVariable) {
      different.push(name);
      continue;
    }
    if (leftVariable.value.kind !== rightVariable.value.kind) {
      different.push(name);
      continue;
    }
    if (leftVariable.value.kind === "configured") {
      unknown.push(name);
      continue;
    }
    if (
      leftVariable.value.kind === "host" &&
      rightVariable.value.kind === "host" &&
      leftVariable.value.variable !== rightVariable.value.variable
    ) {
      different.push(name);
    }
    if (
      leftVariable.value.kind === "symbolic" &&
      rightVariable.value.kind === "symbolic" &&
      leftVariable.value.expression !== rightVariable.value.expression
    ) {
      different.push(name);
    }
  }
  return { different, unknown };
}

function sortedSet(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])].sort(compareText);
}

function equalSets(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined,
): boolean {
  const leftSet = sortedSet(left);
  const rightSet = sortedSet(right);
  return (
    leftSet.length === rightSet.length && leftSet.every((value, index) => value === rightSet[index])
  );
}

function capabilitiesDiffer(left: EffectiveMcpServer, right: EffectiveMcpServer): boolean {
  return (
    !equalSets(left.capabilities?.tools, right.capabilities?.tools) ||
    !equalSets(left.capabilities?.resources, right.capabilities?.resources) ||
    !equalSets(left.capabilities?.prompts, right.capabilities?.prompts)
  );
}

function comparePair(
  left: EffectiveMcpServer,
  right: EffectiveMcpServer,
  leftHarness: HarnessId,
  rightHarness: HarnessId,
): { findings: CompatibilityFinding[]; status: EntityStatus } {
  const findings: CompatibilityFinding[] = [];
  const evidence = pairEvidence(left, right, leftHarness, rightHarness);
  let knownDivergence = false;
  let hasUnknown = false;

  if (
    left.transport === undefined ||
    right.transport === undefined ||
    left.transport === "unknown" ||
    right.transport === "unknown"
  ) {
    hasUnknown = true;
    findings.push({
      id: createFindingId({
        category: "mcp",
        type: "unknown",
        logicalKey: left.name,
        aspect: "configuration",
      }),
      category: "mcp",
      type: "unknown",
      severity: "info",
      confidence: "deterministic",
      left: { present: true, detail: `Transport ${left.transport ?? "unspecified"}` },
      right: { present: true, detail: `Transport ${right.transport ?? "unspecified"}` },
      explanation: `The ${left.name} MCP server configuration cannot be compared deterministically because at least one transport is unknown.`,
      evidence,
    });
  } else {
    const differingFields = configDifferences(left, right);
    if (differingFields.length > 0) {
      knownDivergence = true;
      findings.push({
        id: createFindingId({
          category: "mcp",
          type: "different",
          logicalKey: left.name,
          aspect: "configuration",
        }),
        category: "mcp",
        type: "different",
        severity: "medium",
        confidence: "deterministic",
        left: { present: true, detail: `Configured ${differingFields.join(", ")}` },
        right: { present: true, detail: `Configured ${differingFields.join(", ")}` },
        explanation: `The ${left.name} MCP server differs in normalized ${differingFields.join(", ")}.`,
        evidence,
      });
    }
  }

  const environment = environmentComparison(left, right);
  if (environment.different.length > 0) {
    knownDivergence = true;
    findings.push({
      id: createFindingId({
        category: "mcp",
        type: "different",
        logicalKey: left.name,
        aspect: "environment",
      }),
      category: "mcp",
      type: "different",
      severity: "medium",
      confidence: "deterministic",
      left: {
        present: true,
        detail: `Environment differs for ${environment.different.join(", ")}`,
      },
      right: {
        present: true,
        detail: `Environment differs for ${environment.different.join(", ")}`,
      },
      explanation: `The ${left.name} MCP server uses different normalized environment references for ${environment.different.join(", ")}.`,
      evidence,
    });
  }
  if (environment.unknown.length > 0) {
    hasUnknown = true;
    findings.push({
      id: createFindingId({
        category: "mcp",
        type: "unknown",
        logicalKey: left.name,
        aspect: "environment-redacted",
      }),
      category: "mcp",
      type: "unknown",
      severity: "info",
      confidence: "deterministic",
      left: { present: true, detail: `Redacted or ambiguous: ${environment.unknown.join(", ")}` },
      right: { present: true, detail: `Redacted or ambiguous: ${environment.unknown.join(", ")}` },
      explanation: `The ${left.name} MCP server environment cannot be fully compared for ${environment.unknown.join(", ")} because configured values are redacted or duplicated.`,
      evidence,
    });
  }

  const leftKnown = left.capabilities?.known === true;
  const rightKnown = right.capabilities?.known === true;
  if (leftKnown !== rightKnown) {
    hasUnknown = true;
    findings.push({
      id: createFindingId({
        category: "mcp",
        type: "unknown",
        logicalKey: left.name,
        aspect: "capabilities",
      }),
      category: "mcp",
      type: "unknown",
      severity: "info",
      confidence: "deterministic",
      left: { present: true, detail: `Capabilities ${leftKnown ? "known" : "unknown"}` },
      right: { present: true, detail: `Capabilities ${rightKnown ? "known" : "unknown"}` },
      explanation: `The ${left.name} MCP server's runtime capabilities are known on only one side.`,
      evidence,
    });
  } else if (leftKnown && rightKnown && capabilitiesDiffer(left, right)) {
    knownDivergence = true;
    findings.push({
      id: createFindingId({
        category: "mcp",
        type: "capability-gap",
        logicalKey: left.name,
        aspect: "capabilities",
      }),
      category: "mcp",
      type: "capability-gap",
      severity: "medium",
      confidence: "deterministic",
      left: { present: true, detail: "Known capabilities differ" },
      right: { present: true, detail: "Known capabilities differ" },
      explanation: `The ${left.name} MCP server exposes different known tools, resources, or prompts.`,
      evidence,
    });
  }

  return {
    findings,
    status: knownDivergence ? "divergent" : hasUnknown ? "unknown" : "equivalent",
  };
}

export function compareMcpServers(
  leftConfig: EffectiveAgentConfig,
  rightConfig: EffectiveAgentConfig,
): CategoryComparisonResult {
  const findings: CompatibilityFinding[] = [];
  const entities: ComparedEntity[] = [];
  const leftGroups = groupServers(leftConfig.mcpServers);
  const rightGroups = groupServers(rightConfig.mcpServers);

  for (const name of allKeys(leftGroups, rightGroups)) {
    const left = leftGroups.get(name) ?? [];
    const right = rightGroups.get(name) ?? [];
    if (left.length === 0 || right.length === 0) {
      const existingSide = left.length > 0 ? "left" : "right";
      const server = (left.length > 0 ? left : right)[0];
      if (!server) continue;
      findings.push(
        missingServerFinding(name, server, existingSide, leftConfig.harness, rightConfig.harness),
      );
      entities.push({ category: "mcp", key: name, status: "divergent" });
      continue;
    }
    if (left.length !== 1 || right.length !== 1 || !left[0] || !right[0]) {
      findings.push(
        ambiguousServerFinding(name, left, right, leftConfig.harness, rightConfig.harness),
      );
      entities.push({ category: "mcp", key: name, status: "unknown" });
      continue;
    }
    const result = comparePair(left[0], right[0], leftConfig.harness, rightConfig.harness);
    findings.push(...result.findings);
    entities.push({ category: "mcp", key: name, status: result.status });
  }

  return {
    findings: sortFindings(findings),
    entities: [...entities].sort((left, right) => compareText(left.key, right.key)),
  };
}
