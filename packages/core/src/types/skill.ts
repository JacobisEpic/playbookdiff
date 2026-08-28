import type { SourceRef } from "./source.js";

export type SkillDiscoveryState = "available" | "conditional" | "unavailable" | "unknown";

export type InvocationState = "allowed" | "blocked" | "unknown";

export type AdvertisementState = "advertised" | "hidden" | "budget-risk" | "unknown";

/**
 * Keeps discovery, invocation, and initial model advertisement independent so
 * harness-specific skill semantics are not collapsed into an enabled flag.
 */
export type EffectiveSkill = {
  id: string;
  name: string;
  description?: string;
  path: string;
  source: SourceRef;
  discovery: {
    state: SkillDiscoveryState;
    reason?: string;
  };
  invocation: {
    explicit: InvocationState;
    implicit: InvocationState;
  };
  advertisement: {
    state: AdvertisementState;
    descriptionLimitChars?: number;
    aggregateBudget?: {
      maxContextFraction?: number;
      fallbackChars?: number;
    };
  };
  crossReferences?: string[];
  metadataSources?: SourceRef[];
};
