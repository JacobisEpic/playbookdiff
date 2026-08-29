import { compareEffectiveConfigs } from "@playbookdiff/core";
import type { CompatibilityReport, EffectiveAgentConfig } from "@playbookdiff/core";
import {
  AnalysisContextError as ClaudeAnalysisContextError,
  compileClaudeConfig,
} from "@playbookdiff/harness-claude";
import {
  AnalysisContextError as CodexAnalysisContextError,
  compileCodexConfig,
} from "@playbookdiff/harness-codex";

/**
 * PlaybookDiff CLI-facing request. `repository` models the repository being
 * analyzed; `cwd` models the directory the coding agent was launched from,
 * relative to `repository`; `targetPath` models the file the coding agent is
 * working on, relative to `repository`. `cwd` and `targetPath` are
 * intentionally distinct concepts and must never be substituted for one
 * another.
 */
export type AnalysisRequest = {
  repository: string;
  cwd: string;
  targetPath?: string;
};

export type AnalysisResult = {
  claude: EffectiveAgentConfig;
  codex: EffectiveAgentConfig;
  report: CompatibilityReport;
};

/**
 * A caller contract violation raised by an adapter while resolving
 * repository/cwd/targetPath (missing repository, path escapes the
 * repository, and similar). Both harness packages define their own class
 * with this shape, so this checks either.
 */
export function isAnalysisContextError(error: unknown): error is Error {
  return error instanceof ClaudeAnalysisContextError || error instanceof CodexAnalysisContextError;
}

/**
 * Compiles both harnesses' effective repository configuration for the same
 * repository/cwd/targetPath and compares them. This is the only orchestration
 * path the CLI uses; it does not duplicate adapter discovery or comparator
 * logic.
 */
export async function analyzeRepository(request: AnalysisRequest): Promise<AnalysisResult> {
  const context = {
    repositoryRoot: request.repository,
    cwd: request.cwd,
    mode: "repo" as const,
    ...(request.targetPath !== undefined ? { targetPath: request.targetPath } : {}),
  };

  const [claude, codex] = await Promise.all([
    compileClaudeConfig(context),
    compileCodexConfig(context),
  ]);

  return { claude, codex, report: compareEffectiveConfigs(claude, codex) };
}
