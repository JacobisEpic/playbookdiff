export { analyzeRepository, isAnalysisContextError } from "./analysis.js";
export type { AnalysisRequest, AnalysisResult } from "./analysis.js";
export { runCli } from "./cli.js";
export { runCheck } from "./commands/check.js";
export type { CheckOptions } from "./commands/check.js";
export { buildDiffSummary, DiffRevisionAnalysisError, runDiff } from "./commands/diff.js";
export type { CompatibilityDiffSummary, DiffOptions, RevisionSummary } from "./commands/diff.js";
export { runExplain } from "./commands/explain.js";
export type { ExplainOptions } from "./commands/explain.js";
export type { CommandOutcome } from "./commands/outcome.js";
export {
  actionableFindings,
  determineCheckExitCode,
  determineDiffExitCode,
  EXIT_ACTIONABLE_FINDINGS,
  EXIT_ANALYSIS_ERROR,
  EXIT_SUCCESS,
  isActionableFinding,
} from "./exit-codes.js";
export { buildCliContext } from "./format/context.js";
export type { CliContext } from "./format/context.js";
export { renderDiffHuman } from "./format/diff-human.js";
export { toDiffJson } from "./format/diff-json.js";
export type { DiffJsonOutput } from "./format/diff-json.js";
export { renderExplainHuman } from "./format/explain-human.js";
export { renderCheckHuman, renderDiagnostics, renderFinding } from "./format/human.js";
export { toCheckJson, toExplainJson } from "./format/json.js";
export type { CheckJsonOutput, ExplainJsonOutput } from "./format/json.js";
export { GitRepositoryError, assertGitWorkTree } from "./git/repository.js";
export {
  InvalidRevisionRangeError,
  RevisionResolutionError,
  parseRevisionRange,
  resolveRevision,
} from "./git/revisions.js";
export { GitCommandError, runGit } from "./git/exec.js";
export { withMaterializedRevision } from "./git/materialize.js";
export { readCliVersion } from "./version.js";
