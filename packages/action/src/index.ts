import * as core from "@actions/core";
import { readEventFromPath, resolveRevisions } from "./context.js";
import { buildOutputs } from "./outputs.js";
import { enrichAnalysisErrorMessage, runAction } from "./run-action.js";
import { renderStepSummary } from "./summary.js";

async function main(): Promise<void> {
  const explicitBaseline = core.getInput("baseline") || undefined;
  const explicitCandidate = core.getInput("candidate") || undefined;
  const cwd = core.getInput("cwd") || ".";
  const targetPath = core.getInput("path") || undefined;

  const eventName = process.env.GITHUB_EVENT_NAME;
  const event = await readEventFromPath(process.env.GITHUB_EVENT_PATH);

  const revisions = resolveRevisions({
    ...(explicitBaseline !== undefined ? { explicitBaseline } : {}),
    ...(explicitCandidate !== undefined ? { explicitCandidate } : {}),
    ...(eventName !== undefined ? { eventName } : {}),
    event,
  });
  if ("error" in revisions) {
    core.setFailed(revisions.error);
    return;
  }

  const workspace = process.env.GITHUB_WORKSPACE;
  if (workspace !== undefined && workspace.length > 0 && workspace !== process.cwd()) {
    process.chdir(workspace);
  }

  const outcome = await runAction({
    repository: ".",
    baseline: revisions.baseline,
    candidate: revisions.candidate,
    cwd,
    ...(targetPath !== undefined ? { targetPath } : {}),
  });

  if (outcome.status === "error") {
    core.setFailed(enrichAnalysisErrorMessage(outcome.message));
    return;
  }

  const outputs = buildOutputs(outcome);
  for (const [name, value] of Object.entries(outputs)) core.setOutput(name, value);

  const { summary } = outcome.json.diff;
  core.info(`Baseline: ${outcome.json.baseline.revision} (${outcome.json.baseline.commit})`);
  core.info(`Candidate: ${outcome.json.candidate.revision} (${outcome.json.candidate.commit})`);
  core.info(
    `Introduced: ${summary.introduced} (${summary.introducedActionable} actionable, ${summary.introducedInformational} informational)`,
  );
  core.info(`Resolved: ${summary.resolved}`);
  core.info(`Unchanged: ${summary.unchanged}`);

  await core.summary.addRaw(renderStepSummary(outcome.json)).write();

  if (outcome.status === "regressions") {
    core.setFailed(
      `PlaybookDiff found ${summary.introducedActionable} new actionable Claude Code <-> Codex compatibility regression(s).`,
    );
  } else {
    core.info("No new actionable Claude Code <-> Codex compatibility regressions.");
  }
}

main().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
