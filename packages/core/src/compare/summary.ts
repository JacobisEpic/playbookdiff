import type {
  CategorySummary,
  CompatibilityFinding,
  CompatibilitySummary,
  FindingCategory,
} from "../types/index.js";
import type { ComparedEntity, EntityStatus } from "./model.js";

const STATUS_RANK: Record<EntityStatus, number> = {
  equivalent: 0,
  unknown: 1,
  divergent: 2,
};

function emptyCategorySummary(): CategorySummary {
  return { equivalent: 0, divergent: 0, unknown: 0 };
}

export function buildSummary(
  findings: readonly CompatibilityFinding[],
  entities: readonly ComparedEntity[],
): CompatibilitySummary {
  const counts = { high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of findings) counts[finding.severity] += 1;

  const statuses = new Map<
    string,
    { category: ComparedEntity["category"]; status: EntityStatus }
  >();
  for (const entity of entities) {
    const mapKey = `${entity.category}\0${entity.key}`;
    const current = statuses.get(mapKey);
    if (!current || STATUS_RANK[entity.status] > STATUS_RANK[current.status]) {
      statuses.set(mapKey, { category: entity.category, status: entity.status });
    }
  }

  const byCategory: Record<string, CategorySummary> = {
    instruction: emptyCategorySummary(),
    skill: emptyCategorySummary(),
    mcp: emptyCategorySummary(),
  };
  for (const entity of statuses.values()) {
    const category = byCategory[entity.category] ?? emptyCategorySummary();
    category[entity.status] += 1;
    byCategory[entity.category] = category;
  }
  return { counts, byCategory };
}

export function isDivergenceType(
  type: CompatibilityFinding["type"],
): type is Exclude<CompatibilityFinding["type"], "unknown" | "informational"> {
  return type !== "unknown" && type !== "informational";
}

export function categoryOf(entity: ComparedEntity): Exclude<FindingCategory, "other"> {
  return entity.category;
}
