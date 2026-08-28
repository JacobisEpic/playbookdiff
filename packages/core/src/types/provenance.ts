import type { SourceRef } from "./source.js";

export type ResolutionStrategy =
  | "merged"
  | "override"
  | "shadowed"
  | "inherited"
  | "matched"
  | "unknown";

/** Connects an effective value to every source involved in its resolution. */
export type ProvenanceRecord = {
  effectiveId: string;
  sources: SourceRef[];
  resolution?: {
    strategy: ResolutionStrategy;
    overriddenSources?: SourceRef[];
  };
};
