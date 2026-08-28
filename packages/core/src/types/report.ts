import type { EffectiveAgentConfig } from "./config.js";
import type { CompatibilityFinding } from "./finding.js";

export type CategorySummary = {
  equivalent: number;
  divergent: number;
  unknown: number;
};

export type CompatibilitySummary = {
  counts: {
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  byCategory: Record<string, CategorySummary>;
};

export type CompatibilityReport = {
  left: EffectiveAgentConfig;
  right: EffectiveAgentConfig;
  findings: CompatibilityFinding[];
  summary: CompatibilitySummary;
};
