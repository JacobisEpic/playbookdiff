import { analyzeRepository, isAnalysisContextError } from "../analysis.js";
import { EXIT_ANALYSIS_ERROR, determineCheckExitCode } from "../exit-codes.js";
import { buildCliContext } from "../format/context.js";
import { renderCheckHuman } from "../format/human.js";
import { toCheckJson } from "../format/json.js";
import type { CommandOutcome } from "./outcome.js";

export type CheckOptions = {
  repository: string;
  cwd: string;
  targetPath?: string;
  json: boolean;
};

export async function runCheck(options: CheckOptions): Promise<CommandOutcome> {
  let result;
  try {
    result = await analyzeRepository({
      repository: options.repository,
      cwd: options.cwd,
      ...(options.targetPath !== undefined ? { targetPath: options.targetPath } : {}),
    });
  } catch (error) {
    if (isAnalysisContextError(error)) {
      return { exitCode: EXIT_ANALYSIS_ERROR, stderr: `Error: ${error.message}` };
    }
    throw error;
  }

  const context = buildCliContext(options.repository, result.claude);
  const exitCode = determineCheckExitCode(result.report);
  const stdout = options.json
    ? toCheckJson(context, result.report)
    : renderCheckHuman(context, result.report);
  return { exitCode, stdout };
}
