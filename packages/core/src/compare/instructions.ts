import type {
  CompatibilityFinding,
  EffectiveAgentConfig,
  EffectiveInstruction,
  HarnessId,
} from "../types/index.js";
import { instructionEvidence } from "./evidence.js";
import { createFindingId, stableDigest } from "./ids.js";
import type { CategoryComparisonResult, ComparedEntity } from "./model.js";
import { sortFindings } from "./sort.js";

type IndexedInstruction = {
  instruction: EffectiveInstruction;
  canonicalContent: string;
  contentKey: string;
  scopeKey: string;
};

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function harnessLabel(harness: HarnessId): string {
  return harness === "claude" ? "Claude Code" : "Codex";
}

export function canonicalizeInstructionContent(content: string): string {
  const lineNormalized = content.replace(/\r\n?/g, "\n");
  return lineNormalized.endsWith("\n") ? lineNormalized.slice(0, -1) : lineNormalized;
}

function sorted(values: readonly string[] | undefined): string[] {
  return [...(values ?? [])].sort(compareText);
}

export function instructionScopeSignature(instruction: EffectiveInstruction): string {
  return JSON.stringify({
    appliesTo: sorted(instruction.scope.appliesTo),
    excludedFrom: sorted(instruction.scope.excludedFrom),
    loadPhase: instruction.loadPhase ?? "unknown",
  });
}

function scopeDetail(instruction: EffectiveInstruction): string {
  const appliesTo = sorted(instruction.scope.appliesTo).join(", ") || "none";
  const excludedFrom = sorted(instruction.scope.excludedFrom).join(", ") || "none";
  return `${instruction.loadPhase ?? "unknown"}; applies to ${appliesTo}; excludes ${excludedFrom}`;
}

function indexInstructions(instructions: readonly EffectiveInstruction[]): IndexedInstruction[] {
  return instructions.map((instruction) => {
    const canonicalContent = canonicalizeInstructionContent(instruction.content);
    return {
      instruction,
      canonicalContent,
      contentKey: stableDigest(["instruction-content-v1", canonicalContent]),
      scopeKey: instructionScopeSignature(instruction),
    };
  });
}

function compareIndexed(left: IndexedInstruction, right: IndexedInstruction): number {
  return (
    compareText(left.scopeKey, right.scopeKey) ||
    compareText(
      left.instruction.loadPhase ?? "unknown",
      right.instruction.loadPhase ?? "unknown",
    ) ||
    (left.instruction.order ?? Number.MAX_SAFE_INTEGER) -
      (right.instruction.order ?? Number.MAX_SAFE_INTEGER) ||
    compareText(left.instruction.source.path, right.instruction.source.path) ||
    compareText(left.instruction.id, right.instruction.id)
  );
}

function addToMap(
  map: Map<string, IndexedInstruction[]>,
  key: string,
  instruction: IndexedInstruction,
): void {
  const values = map.get(key) ?? [];
  values.push(instruction);
  map.set(key, values);
}

function exactContentGroups(
  instructions: readonly IndexedInstruction[],
): Map<string, IndexedInstruction[]> {
  const groups = new Map<string, IndexedInstruction[]>();
  for (const instruction of instructions)
    addToMap(groups, instruction.canonicalContent, instruction);
  for (const values of groups.values()) values.sort(compareIndexed);
  return groups;
}

function bucketGroups(
  instructions: readonly IndexedInstruction[],
): Map<string, IndexedInstruction[]> {
  const groups = new Map<string, IndexedInstruction[]>();
  for (const instruction of instructions) addToMap(groups, instruction.scopeKey, instruction);
  for (const values of groups.values()) {
    values.sort(
      (left, right) =>
        compareText(left.contentKey, right.contentKey) || compareIndexed(left, right),
    );
  }
  return groups;
}

function allKeys(left: Map<string, unknown>, right: Map<string, unknown>): string[] {
  return [...new Set([...left.keys(), ...right.keys()])].sort(compareText);
}

function exactScopeFinding(
  left: IndexedInstruction,
  right: IndexedInstruction,
  occurrence: number,
  leftHarness: HarnessId,
  rightHarness: HarnessId,
): CompatibilityFinding {
  const logicalKey = `${left.contentKey}:occurrence-${occurrence}`;
  return {
    id: createFindingId({
      category: "instruction",
      type: "scope-gap",
      logicalKey,
      aspect: "applicability",
    }),
    category: "instruction",
    type: "scope-gap",
    severity: "medium",
    confidence: "deterministic",
    left: { present: true, detail: scopeDetail(left.instruction) },
    right: { present: true, detail: scopeDetail(right.instruction) },
    explanation: `The same instruction content has different applicability in ${harnessLabel(leftHarness)} and ${harnessLabel(rightHarness)}.`,
    evidence: [
      instructionEvidence(left.instruction, `${harnessLabel(leftHarness)} instruction`),
      instructionEvidence(right.instruction, `${harnessLabel(rightHarness)} instruction`),
    ],
  };
}

function unmatchedBucketFinding(
  scopeKey: string,
  left: readonly IndexedInstruction[],
  right: readonly IndexedInstruction[],
  leftHarness: HarnessId,
  rightHarness: HarnessId,
): CompatibilityFinding {
  const logicalKey = `bucket:${scopeKey}`;
  return {
    id: createFindingId({
      category: "instruction",
      type: "unknown",
      logicalKey,
      aspect: "semantic-text",
    }),
    category: "instruction",
    type: "unknown",
    severity: "info",
    confidence: "deterministic",
    left: { present: true, detail: `${left.length} unmatched instruction(s)` },
    right: { present: true, detail: `${right.length} unmatched instruction(s)` },
    explanation: `${harnessLabel(leftHarness)} and ${harnessLabel(rightHarness)} have different instruction text for the same effective scope. Semantic compatibility has not been evaluated.`,
    evidence: [
      ...left
        .slice(0, 3)
        .map((item) =>
          instructionEvidence(
            item.instruction,
            `${harnessLabel(leftHarness)} unmatched instruction`,
          ),
        ),
      ...right
        .slice(0, 3)
        .map((item) =>
          instructionEvidence(
            item.instruction,
            `${harnessLabel(rightHarness)} unmatched instruction`,
          ),
        ),
    ],
  };
}

function missingFinding(
  item: IndexedInstruction,
  occurrence: number,
  existingSide: "left" | "right",
  leftHarness: HarnessId,
  rightHarness: HarnessId,
): CompatibilityFinding {
  const missingSide = existingSide === "left" ? "right" : "left";
  const existingHarness = existingSide === "left" ? leftHarness : rightHarness;
  const missingHarness = existingSide === "left" ? rightHarness : leftHarness;
  const logicalKey = `${item.scopeKey}:${item.contentKey}:occurrence-${occurrence}`;
  return {
    id: createFindingId({
      category: "instruction",
      type: "missing",
      logicalKey,
      aspect: "presence",
      direction: missingSide,
    }),
    category: "instruction",
    type: "missing",
    severity: "medium",
    confidence: "deterministic",
    left: { present: existingSide === "left" },
    right: { present: existingSide === "right" },
    explanation: `${harnessLabel(existingHarness)} has an instruction for this effective scope, while ${harnessLabel(missingHarness)} has no deterministic corresponding instruction.`,
    evidence: [
      instructionEvidence(item.instruction, `${harnessLabel(existingHarness)} instruction`),
    ],
  };
}

export function compareInstructions(
  leftConfig: EffectiveAgentConfig,
  rightConfig: EffectiveAgentConfig,
): CategoryComparisonResult {
  const findings: CompatibilityFinding[] = [];
  const entities: ComparedEntity[] = [];
  const leftGroups = exactContentGroups(indexInstructions(leftConfig.instructions));
  const rightGroups = exactContentGroups(indexInstructions(rightConfig.instructions));
  const unmatchedLeft: IndexedInstruction[] = [];
  const unmatchedRight: IndexedInstruction[] = [];

  for (const content of allKeys(leftGroups, rightGroups)) {
    const left = leftGroups.get(content) ?? [];
    const right = rightGroups.get(content) ?? [];
    const pairCount = Math.min(left.length, right.length);
    for (let index = 0; index < pairCount; index += 1) {
      const leftItem = left[index];
      const rightItem = right[index];
      if (!leftItem || !rightItem) continue;
      const entityKey = `exact:${leftItem.contentKey}:occurrence-${index}`;
      if (leftItem.scopeKey === rightItem.scopeKey) {
        entities.push({ category: "instruction", key: entityKey, status: "equivalent" });
      } else {
        findings.push(
          exactScopeFinding(leftItem, rightItem, index, leftConfig.harness, rightConfig.harness),
        );
        entities.push({ category: "instruction", key: entityKey, status: "divergent" });
      }
    }
    unmatchedLeft.push(...left.slice(pairCount));
    unmatchedRight.push(...right.slice(pairCount));
  }

  const leftBuckets = bucketGroups(unmatchedLeft);
  const rightBuckets = bucketGroups(unmatchedRight);
  for (const scopeKey of allKeys(leftBuckets, rightBuckets)) {
    const left = leftBuckets.get(scopeKey) ?? [];
    const right = rightBuckets.get(scopeKey) ?? [];
    if (left.length > 0 && right.length > 0) {
      const entityKey = `bucket:${scopeKey}`;
      findings.push(
        unmatchedBucketFinding(scopeKey, left, right, leftConfig.harness, rightConfig.harness),
      );
      entities.push({ category: "instruction", key: entityKey, status: "unknown" });
      continue;
    }
    const existingSide = left.length > 0 ? "left" : "right";
    const items = left.length > 0 ? left : right;
    items.forEach((item, occurrence) => {
      const entityKey = `missing:${scopeKey}:${item.contentKey}:occurrence-${occurrence}`;
      findings.push(
        missingFinding(item, occurrence, existingSide, leftConfig.harness, rightConfig.harness),
      );
      entities.push({ category: "instruction", key: entityKey, status: "divergent" });
    });
  }

  return {
    findings: sortFindings(findings),
    entities: [...entities].sort((left, right) => compareText(left.key, right.key)),
  };
}
