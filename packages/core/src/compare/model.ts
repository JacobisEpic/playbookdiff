import type { CompatibilityFinding, FindingCategory } from "../types/index.js";

export type EntityStatus = "equivalent" | "divergent" | "unknown";

export type ComparedEntity = {
  category: Exclude<FindingCategory, "other">;
  key: string;
  status: EntityStatus;
};

export type CategoryComparisonResult = {
  findings: CompatibilityFinding[];
  entities: ComparedEntity[];
};
