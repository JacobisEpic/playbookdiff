import type { SourceRef } from "./source.js";

export type InstructionLoadPhase = "startup" | "on-demand";

/** Instruction text is preserved exactly as read from its source. */
export type EffectiveInstruction = {
  id: string;
  content: string;
  source: SourceRef;
  /**
   * Applicability in PlaybookDiff's canonical scope coordinate system:
   * repository-root-relative POSIX paths or globs, with the repository root
   * itself written as `"."`.
   *
   * Adapters must express applicability against the repository root, never
   * against the launch `cwd` and never as an absolute path, so that two
   * instructions governing the same effective location compare equal no
   * matter which adapter discovered them or where the agent was launched.
   * Genuine harness differences belong in `loadPhase` and in which
   * instructions are discovered at all, not in how the same location is
   * spelled.
   */
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
