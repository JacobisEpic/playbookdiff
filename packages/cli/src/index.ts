export { analyzeRepository, isAnalysisContextError } from "./analysis.js";
export type { AnalysisRequest, AnalysisResult } from "./analysis.js";
export { runCli } from "./cli.js";
export { runCheck } from "./commands/check.js";
export type { CheckOptions } from "./commands/check.js";
export { runExplain } from "./commands/explain.js";
export type { ExplainOptions } from "./commands/explain.js";
export type { CommandOutcome } from "./commands/outcome.js";
export {
  actionableFindings,
  determineCheckExitCode,
  EXIT_ACTIONABLE_FINDINGS,
  EXIT_ANALYSIS_ERROR,
  EXIT_SUCCESS,
  isActionableFinding,
} from "./exit-codes.js";
export { buildCliContext } from "./format/context.js";
export type { CliContext } from "./format/context.js";
export { renderExplainHuman } from "./format/explain-human.js";
export { renderCheckHuman } from "./format/human.js";
export { toCheckJson, toExplainJson } from "./format/json.js";
export type { CheckJsonOutput, ExplainJsonOutput } from "./format/json.js";
export { readCliVersion } from "./version.js";
