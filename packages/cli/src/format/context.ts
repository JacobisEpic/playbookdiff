import type { EffectiveAgentConfig } from "@playbookdiff/core";

/**
 * Minimal, explicitly-typed CLI execution metadata shown alongside a report.
 * `repository` is the argument as given by the caller; `cwd` and `targetPath`
 * are the repo-relative values the adapters actually resolved, so displayed
 * context always reflects what was analyzed rather than what was requested.
 */
export type CliContext = {
  repository: string;
  cwd: string;
  targetPath?: string;
};

export function buildCliContext(repository: string, resolved: EffectiveAgentConfig): CliContext {
  return {
    repository,
    cwd: resolved.target.cwd,
    ...(resolved.target.targetPath !== undefined ? { targetPath: resolved.target.targetPath } : {}),
  };
}
