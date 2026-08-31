import path from "node:path";
import type {
  AdvertisementState,
  CompatibilityFinding,
  EffectiveAgentConfig,
  EffectiveSkill,
  HarnessId,
} from "../types/index.js";
import { skillEvidence } from "./evidence.js";
import { createFindingId } from "./ids.js";
import { canonicalizeInstructionContent } from "./instructions.js";
import type { CategoryComparisonResult, ComparedEntity, EntityStatus } from "./model.js";
import { sortFindings } from "./sort.js";

type IndexedSkill = {
  skill: EffectiveSkill;
  logicalKey: string;
  locationKey: string;
};

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function harnessLabel(harness: HarnessId): string {
  return harness === "claude" ? "Claude Code" : "Codex";
}

function skillDirectoryBasename(skillPath: string): string {
  return path.posix.basename(path.posix.dirname(skillPath));
}

export function logicalSkillKey(skill: EffectiveSkill): string {
  const directoryName = skillDirectoryBasename(skill.path);
  const suffix = `:${directoryName}`;
  return skill.name.endsWith(suffix) && skill.name.length > suffix.length
    ? directoryName
    : skill.name;
}

export function skillLocationKey(skill: EffectiveSkill): string {
  const segments = skill.path.split("/");
  const directoryName = skillDirectoryBasename(skill.path);
  let markerIndex = -1;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index];
    const next = segments[index + 1];
    if ((current === ".claude" || current === ".agents") && next === "skills") {
      markerIndex = index;
      break;
    }
  }
  if (markerIndex < 0) return `unknown:${directoryName}`;
  const prefix = segments.slice(0, markerIndex).join("/") || ".";
  return `${prefix}:${directoryName}`;
}

function indexSkills(skills: readonly EffectiveSkill[]): IndexedSkill[] {
  return skills.map((skill) => ({
    skill,
    logicalKey: logicalSkillKey(skill),
    locationKey: skillLocationKey(skill),
  }));
}

function groupSkills(skills: readonly IndexedSkill[]): Map<string, IndexedSkill[]> {
  const groups = new Map<string, IndexedSkill[]>();
  for (const skill of skills) {
    const current = groups.get(skill.logicalKey) ?? [];
    current.push(skill);
    groups.set(skill.logicalKey, current);
  }
  for (const group of groups.values()) {
    group.sort(
      (left, right) =>
        compareText(left.locationKey, right.locationKey) ||
        compareText(left.skill.path, right.skill.path) ||
        compareText(left.skill.id, right.skill.id),
    );
  }
  return groups;
}

function allKeys(left: Map<string, unknown>, right: Map<string, unknown>): string[] {
  return [...new Set([...left.keys(), ...right.keys()])].sort(compareText);
}

function uniqueLocationMap(group: readonly IndexedSkill[]): Map<string, IndexedSkill> | undefined {
  const result = new Map<string, IndexedSkill>();
  for (const skill of group) {
    if (result.has(skill.locationKey)) return undefined;
    result.set(skill.locationKey, skill);
  }
  return result;
}

function deterministicPairs(
  left: readonly IndexedSkill[],
  right: readonly IndexedSkill[],
): Array<{ left: IndexedSkill; right: IndexedSkill; entityKey: string }> | undefined {
  if (left.length === 1 && right.length === 1 && left[0] && right[0]) {
    return [{ left: left[0], right: right[0], entityKey: left[0].logicalKey }];
  }
  if (left.length !== right.length) return undefined;
  const leftByLocation = uniqueLocationMap(left);
  const rightByLocation = uniqueLocationMap(right);
  if (!leftByLocation || !rightByLocation) return undefined;
  const locations = [...leftByLocation.keys()].sort(compareText);
  if (
    locations.length !== rightByLocation.size ||
    locations.some((location) => !rightByLocation.has(location))
  ) {
    return undefined;
  }
  return locations.flatMap((location) => {
    const leftSkill = leftByLocation.get(location);
    const rightSkill = rightByLocation.get(location);
    return leftSkill && rightSkill
      ? [{ left: leftSkill, right: rightSkill, entityKey: `${leftSkill.logicalKey}@${location}` }]
      : [];
  });
}

function skillStateDetail(skill: EffectiveSkill): string {
  return `discovery ${skill.discovery.state}; explicit ${skill.invocation.explicit}; implicit ${skill.invocation.implicit}; advertisement ${skill.advertisement.state}`;
}

function missingSkillFinding(
  logicalKey: string,
  existing: readonly IndexedSkill[],
  existingSide: "left" | "right",
  leftHarness: HarnessId,
  rightHarness: HarnessId,
): CompatibilityFinding {
  const missingSide = existingSide === "left" ? "right" : "left";
  const existingHarness = existingSide === "left" ? leftHarness : rightHarness;
  const missingHarness = existingSide === "left" ? rightHarness : leftHarness;
  return {
    id: createFindingId({
      category: "skill",
      type: "capability-gap",
      logicalKey,
      aspect: "presence",
      direction: missingSide,
    }),
    category: "skill",
    type: "capability-gap",
    severity: "medium",
    confidence: "deterministic",
    left: { present: existingSide === "left" },
    right: { present: existingSide === "right" },
    explanation: `The ${logicalKey} skill is repository-discovered only for ${harnessLabel(existingHarness)}, not ${harnessLabel(missingHarness)}.`,
    evidence: existing
      .slice(0, 3)
      .map((item) => skillEvidence(item.skill, `${harnessLabel(existingHarness)} skill`)),
  };
}

function ambiguousGroupFinding(
  logicalKey: string,
  left: readonly IndexedSkill[],
  right: readonly IndexedSkill[],
  leftHarness: HarnessId,
  rightHarness: HarnessId,
): CompatibilityFinding {
  return {
    id: createFindingId({
      category: "skill",
      type: "unknown",
      logicalKey,
      aspect: "duplicate-pairing",
    }),
    category: "skill",
    type: "unknown",
    severity: "info",
    confidence: "deterministic",
    left: { present: true, detail: `${left.length} candidate(s)` },
    right: { present: true, detail: `${right.length} candidate(s)` },
    explanation: `Multiple ${logicalKey} skill candidates cannot be paired unambiguously between ${harnessLabel(leftHarness)} and ${harnessLabel(rightHarness)}.`,
    evidence: [
      ...left
        .slice(0, 3)
        .map((item) => skillEvidence(item.skill, `${harnessLabel(leftHarness)} candidate`)),
      ...right
        .slice(0, 3)
        .map((item) => skillEvidence(item.skill, `${harnessLabel(rightHarness)} candidate`)),
    ],
  };
}

function pairEvidence(
  left: IndexedSkill,
  right: IndexedSkill,
  leftHarness: HarnessId,
  rightHarness: HarnessId,
): ReturnType<typeof skillEvidence>[] {
  return [
    skillEvidence(left.skill, `${harnessLabel(leftHarness)} skill`),
    skillEvidence(right.skill, `${harnessLabel(rightHarness)} skill`),
  ];
}

function comparePair(
  left: IndexedSkill,
  right: IndexedSkill,
  entityKey: string,
  leftHarness: HarnessId,
  rightHarness: HarnessId,
): { findings: CompatibilityFinding[]; status: EntityStatus } {
  const findings: CompatibilityFinding[] = [];
  const evidence = pairEvidence(left, right, leftHarness, rightHarness);
  let knownDivergence = false;
  let hasUnknown = false;

  if (left.skill.discovery.state === "unknown" || right.skill.discovery.state === "unknown") {
    hasUnknown = true;
    findings.push({
      id: createFindingId({
        category: "skill",
        type: "unknown",
        logicalKey: entityKey,
        aspect: "discovery",
      }),
      category: "skill",
      type: "unknown",
      severity: "info",
      confidence: "deterministic",
      left: { present: true, detail: `Discovery ${left.skill.discovery.state}` },
      right: { present: true, detail: `Discovery ${right.skill.discovery.state}` },
      explanation: `The ${left.logicalKey} skill's discovery compatibility cannot be determined because at least one side is unknown.`,
      evidence,
    });
  } else if (left.skill.discovery.state !== right.skill.discovery.state) {
    knownDivergence = true;
    findings.push({
      id: createFindingId({
        category: "skill",
        type: "scope-gap",
        logicalKey: entityKey,
        aspect: "discovery",
      }),
      category: "skill",
      type: "scope-gap",
      severity: "medium",
      confidence: "deterministic",
      left: { present: true, detail: `Discovery ${left.skill.discovery.state}` },
      right: { present: true, detail: `Discovery ${right.skill.discovery.state}` },
      explanation: `The ${left.logicalKey} skill has different repository discovery scope in ${harnessLabel(leftHarness)} and ${harnessLabel(rightHarness)}.`,
      evidence,
    });
  }

  const invocationUnknown =
    left.skill.invocation.explicit === "unknown" ||
    left.skill.invocation.implicit === "unknown" ||
    right.skill.invocation.explicit === "unknown" ||
    right.skill.invocation.implicit === "unknown";
  const invocationDiffers =
    left.skill.invocation.explicit !== right.skill.invocation.explicit ||
    left.skill.invocation.implicit !== right.skill.invocation.implicit;
  if (invocationUnknown) {
    hasUnknown = true;
    findings.push({
      id: createFindingId({
        category: "skill",
        type: "unknown",
        logicalKey: entityKey,
        aspect: "invocation",
      }),
      category: "skill",
      type: "unknown",
      severity: "info",
      confidence: "deterministic",
      left: { present: true, detail: skillStateDetail(left.skill) },
      right: { present: true, detail: skillStateDetail(right.skill) },
      explanation: `The ${left.logicalKey} skill's invocation compatibility cannot be determined because at least one invocation state is unknown.`,
      evidence,
    });
  } else if (invocationDiffers) {
    knownDivergence = true;
    findings.push({
      id: createFindingId({
        category: "skill",
        type: "capability-gap",
        logicalKey: entityKey,
        aspect: "invocation",
      }),
      category: "skill",
      type: "capability-gap",
      severity: "medium",
      confidence: "deterministic",
      left: {
        present: true,
        detail: `Explicit ${left.skill.invocation.explicit}; implicit ${left.skill.invocation.implicit}`,
      },
      right: {
        present: true,
        detail: `Explicit ${right.skill.invocation.explicit}; implicit ${right.skill.invocation.implicit}`,
      },
      explanation: `The ${left.logicalKey} skill has different explicit or implicit invocation capability in ${harnessLabel(leftHarness)} and ${harnessLabel(rightHarness)}.`,
      evidence,
    });
  }

  const advertisementUnknown =
    left.skill.advertisement.state === "unknown" || right.skill.advertisement.state === "unknown";
  // `budget-risk` says a harness's own aggregate listing budget may shorten or
  // drop descriptions; documented behavior keeps the skill's name listed either
  // way, so it is not a deterministic hidden/advertised state. The two harnesses
  // measure it against different constants (a per-skill character cap versus an
  // aggregate fallback), which makes a bare `budget-risk` vs `advertised`
  // disagreement an artifact of those constants rather than of the repository's
  // configuration. Harness-specific budget constants are not a compatibility
  // dimension, so it is compared as advertised; the risk itself stays visible on
  // the entity and in the adapter's own `budget-risk` diagnostic.
  const comparableAdvertisement = (state: AdvertisementState): AdvertisementState =>
    state === "budget-risk" ? "advertised" : state;
  const leftAdvertisement = comparableAdvertisement(left.skill.advertisement.state);
  const rightAdvertisement = comparableAdvertisement(right.skill.advertisement.state);
  const advertisementDiffers = leftAdvertisement !== rightAdvertisement;
  const invocationExplainsVisibility =
    invocationDiffers &&
    new Set([leftAdvertisement, rightAdvertisement]).has("hidden") &&
    new Set([leftAdvertisement, rightAdvertisement]).has("advertised");
  if (advertisementUnknown) {
    hasUnknown = true;
    findings.push({
      id: createFindingId({
        category: "skill",
        type: "unknown",
        logicalKey: entityKey,
        aspect: "advertisement",
      }),
      category: "skill",
      type: "unknown",
      severity: "info",
      confidence: "deterministic",
      left: { present: true, detail: `Advertisement ${left.skill.advertisement.state}` },
      right: { present: true, detail: `Advertisement ${right.skill.advertisement.state}` },
      explanation: `The ${left.logicalKey} skill's model advertisement compatibility cannot be determined because at least one side is unknown.`,
      evidence,
    });
  } else if (advertisementDiffers && !invocationExplainsVisibility) {
    knownDivergence = true;
    findings.push({
      id: createFindingId({
        category: "skill",
        type: "different",
        logicalKey: entityKey,
        aspect: "advertisement",
      }),
      category: "skill",
      type: "different",
      severity: "low",
      confidence: "deterministic",
      left: { present: true, detail: `Advertisement ${left.skill.advertisement.state}` },
      right: { present: true, detail: `Advertisement ${right.skill.advertisement.state}` },
      explanation: `The ${left.logicalKey} skill has different effective model advertisement state in ${harnessLabel(leftHarness)} and ${harnessLabel(rightHarness)}.`,
      evidence,
    });
  }

  const leftDescription =
    left.skill.description === undefined
      ? undefined
      : canonicalizeInstructionContent(left.skill.description);
  const rightDescription =
    right.skill.description === undefined
      ? undefined
      : canonicalizeInstructionContent(right.skill.description);
  if (leftDescription !== rightDescription) {
    knownDivergence = true;
    findings.push({
      id: createFindingId({
        category: "skill",
        type: "different",
        logicalKey: entityKey,
        aspect: "description",
      }),
      category: "skill",
      type: "different",
      severity: "low",
      confidence: "deterministic",
      left: {
        present: true,
        detail: left.skill.description ? "Description present" : "No description",
      },
      right: {
        present: true,
        detail: right.skill.description ? "Description present" : "No description",
      },
      explanation: `The ${left.logicalKey} skill descriptions differ. Semantic equivalence has not been evaluated.`,
      evidence,
    });
  }

  return {
    findings,
    status: knownDivergence ? "divergent" : hasUnknown ? "unknown" : "equivalent",
  };
}

export function compareSkills(
  leftConfig: EffectiveAgentConfig,
  rightConfig: EffectiveAgentConfig,
): CategoryComparisonResult {
  const findings: CompatibilityFinding[] = [];
  const entities: ComparedEntity[] = [];
  const leftGroups = groupSkills(indexSkills(leftConfig.skills));
  const rightGroups = groupSkills(indexSkills(rightConfig.skills));

  for (const logicalKey of allKeys(leftGroups, rightGroups)) {
    const left = leftGroups.get(logicalKey) ?? [];
    const right = rightGroups.get(logicalKey) ?? [];
    if (left.length === 0 || right.length === 0) {
      const existingSide = left.length > 0 ? "left" : "right";
      findings.push(
        missingSkillFinding(
          logicalKey,
          left.length > 0 ? left : right,
          existingSide,
          leftConfig.harness,
          rightConfig.harness,
        ),
      );
      entities.push({ category: "skill", key: logicalKey, status: "divergent" });
      continue;
    }

    const pairs = deterministicPairs(left, right);
    if (!pairs) {
      findings.push(
        ambiguousGroupFinding(logicalKey, left, right, leftConfig.harness, rightConfig.harness),
      );
      entities.push({ category: "skill", key: logicalKey, status: "unknown" });
      continue;
    }

    for (const pair of pairs) {
      const result = comparePair(
        pair.left,
        pair.right,
        pair.entityKey,
        leftConfig.harness,
        rightConfig.harness,
      );
      findings.push(...result.findings);
      entities.push({ category: "skill", key: pair.entityKey, status: result.status });
    }
  }

  return {
    findings: sortFindings(findings),
    entities: [...entities].sort((left, right) => compareText(left.key, right.key)),
  };
}
