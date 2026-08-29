import type { CompatibilityReportDelta } from "@playbookdiff/core";
import type { CompatibilityDiffSummary, RevisionSummary } from "../commands/diff.js";
import type { CliContext } from "./context.js";
import { renderDiagnostics, renderFinding } from "./human.js";

function shortSha(commit: string): string {
  return commit.slice(0, 7);
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function renderSection(title: string, findings: CompatibilityReportDelta["introduced"]): string[] {
  if (findings.length === 0) return [];
  const lines = [title, ""];
  for (const finding of findings) {
    lines.push(...renderFinding(finding));
    lines.push("");
  }
  return lines;
}

function resultLine(summary: CompatibilityDiffSummary): string {
  if (summary.introducedActionable > 0) {
    return `Result: ${plural(summary.introducedActionable, "new compatibility regression")}`;
  }
  return "Result: no new actionable compatibility regressions";
}

export function renderDiffHuman(
  context: CliContext,
  baseline: RevisionSummary,
  candidate: RevisionSummary,
  delta: CompatibilityReportDelta,
  summary: CompatibilityDiffSummary,
): string {
  const lines: string[] = [];
  lines.push("PlaybookDiff");
  lines.push("");
  lines.push("Claude Code <-> Codex");
  lines.push("Git compatibility diff");
  lines.push("");
  lines.push(`Repository: ${context.repository}`);
  lines.push(`Baseline: ${baseline.revision} (${shortSha(baseline.commit)})`);
  lines.push(`Candidate: ${candidate.revision} (${shortSha(candidate.commit)})`);
  lines.push(`Launch cwd: ${context.cwd}`);
  lines.push(`Target: ${context.targetPath ?? "(repository root)"}`);
  lines.push("");
  lines.push(plural(summary.introducedActionable, "new actionable regression"));
  lines.push(plural(summary.introducedInformational, "new informational finding"));
  lines.push(plural(summary.resolved, "resolved finding"));
  lines.push(plural(summary.unchanged, "unchanged pre-existing finding"));
  lines.push("");

  lines.push(...renderSection("Introduced", delta.introduced));
  lines.push(...renderSection("Resolved", delta.resolved));

  if (summary.unchanged > 0) {
    lines.push(
      `${plural(summary.unchanged, "pre-existing finding")} unchanged from the baseline (not shown; see "playbookdiff check" against a specific revision to inspect them).`,
    );
    lines.push("");
  }

  const diagnosticLines = [
    ...renderDiagnostics("claude", candidate.diagnostics.claude),
    ...renderDiagnostics("codex", candidate.diagnostics.codex),
  ];
  if (diagnosticLines.length > 0) {
    lines.push("Candidate diagnostics");
    lines.push(...diagnosticLines);
    lines.push("");
  }

  lines.push(resultLine(summary));
  return lines.join("\n");
}
