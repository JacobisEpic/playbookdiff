import type { SourceRef } from "./source.js";

export type InstructionLoadPhase = "startup" | "on-demand";

/** Instruction text is preserved exactly as read from its source. */
export type EffectiveInstruction = {
  id: string;
  content: string;
  source: SourceRef;
  scope: {
    appliesTo: string[];
    excludedFrom?: string[];
  };
  loadPhase?: InstructionLoadPhase;
  order?: number;
  metadata?: {
    heading?: string;
  };
};
