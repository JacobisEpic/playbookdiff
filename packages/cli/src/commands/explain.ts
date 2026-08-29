import type { CompatibilityReport } from "@playbookdiff/core";
import { analyzeRepository, isAnalysisContextError } from "../analysis.js";
import { EXIT_ANALYSIS_ERROR, EXIT_SUCCESS } from "../exit-codes.js";
import { buildCliContext } from "../format/context.js";
import { renderExplainHuman } from "../format/explain-human.js";
import { toExplainJson } from "../format/json.js";
import type { CommandOutcome } from "./outcome.js";

export type ExplainOptions = {
  findingId: string;
  repository: string;
  cwd: string;
  targetPath?: string;
  json: boolean;
};

function findFinding(report: CompatibilityReport, findingId: string) {
  return report.findings.find((finding) => finding.id === findingId);
}

export async function runExplain(options: ExplainOptions): Promise<CommandOutcome> {
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
  const finding = findFinding(result.report, options.findingId);
  if (finding === undefined) {
    const message = [
      `Finding ${options.findingId} was not found for this analysis context.`,
      "",
      `Repository: ${context.repository}`,
      `Launch cwd: ${context.cwd}`,
      `Target: ${context.targetPath ?? "(repository root)"}`,
    ].join("\n");
    return { exitCode: EXIT_ANALYSIS_ERROR, stderr: message };
  }

  if (options.json) {
    return { exitCode: EXIT_SUCCESS, stdout: toExplainJson(context, finding) };
  }
  return {
    exitCode: EXIT_SUCCESS,
    stdout: renderExplainHuman(context, finding, {
      left: result.report.left.harness,
      right: result.report.right.harness,
    }),
  };
}
