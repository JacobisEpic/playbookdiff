import type { SourceRef } from "./source.js";

export type Evidence = {
  source: SourceRef;
  excerpt?: string;
  reason?: string;
};

export type FindingCategory = "instruction" | "skill" | "mcp" | "other";

export type FindingType =
  | "missing"
  | "different"
  | "conflict"
  | "capability-gap"
  | "scope-gap"
  | "unknown"
  | "informational";

export type FindingSeverity = "high" | "medium" | "low" | "info";

export type FindingConfidence =
  | "deterministic"
  | "semantic-high"
  | "semantic-medium"
  | "semantic-low";

export type FindingSide = {
  present: boolean;
  detail?: string;
};

export type CompatibilityFinding = {
  id: string;
  category: FindingCategory;
  type: FindingType;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  left?: FindingSide;
  right?: FindingSide;
  explanation: string;
  evidence: Evidence[];
};
