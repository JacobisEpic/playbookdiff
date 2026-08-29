import type {
  CompatibilityFinding,
  CompatibilityReport,
  Diagnostic,
  Evidence,
  FindingCategory,
  FindingType,
  HarnessId,
} from "@playbookdiff/core";
import { actionableFindings } from "../exit-codes.js";
import type { CliContext } from "./context.js";

const CATEGORY_LABEL: Record<FindingCategory, string> = {
  instruction: "Instruction",
  skill: "Skill",
  mcp: "MCP",
  other: "Other",
};

const TYPE_LABEL: Record<FindingType, string> = {
  missing: "missing",
  different: "different",
  conflict: "conflict",
  "capability-gap": "capability gap",
  "scope-gap": "scope gap",
  unknown: "unknown",
  informational: "informational",
};

function findingTitle(finding: CompatibilityFinding): string {
  return `${CATEGORY_LABEL[finding.category]} ${TYPE_LABEL[finding.type]}`;
}

function harnessLabel(harness: HarnessId): string {
  return harness === "claude" ? "Claude Code" : "Codex";
}

function renderEvidenceLine(evidence: Evidence): string {
  const location =
    evidence.source.lineStart !== undefined
      ? `${evidence.source.path}:${evidence.source.lineStart}${
          evidence.source.lineEnd !== undefined &&
          evidence.source.lineEnd !== evidence.source.lineStart
            ? `-${evidence.source.lineEnd}`
            : ""
        }`
      : evidence.source.path;
  const reason = evidence.reason !== undefined ? `${evidence.reason}: ` : "";
  const excerpt = evidence.excerpt !== undefined ? `\n            "${evidence.excerpt}"` : "";
  return `          - ${reason}${location} (${evidence.source.scope})${excerpt}`;
}

export function renderFinding(finding: CompatibilityFinding): string[] {
  const lines: string[] = [];
  lines.push(`${finding.severity.toUpperCase().padEnd(7)} ${findingTitle(finding)}`);
  lines.push(`        ${finding.explanation}`);
  if (finding.evidence.length > 0) {
    lines.push(`        Evidence:`);
    for (const evidence of finding.evidence) lines.push(renderEvidenceLine(evidence));
  }
  lines.push(`        ID: ${finding.id}`);
  return lines;
}

export function renderDiagnostics(
  harness: HarnessId,
  diagnostics: readonly Diagnostic[],
): string[] {
  const notable = diagnostics.filter((d) => d.level === "warning" || d.level === "error");
  if (notable.length === 0) return [];
  const lines = [`  ${harnessLabel(harness)}:`];
  for (const diagnostic of notable) {
    const location = diagnostic.source !== undefined ? ` (${diagnostic.source.path})` : "";
    lines.push(
      `    ${diagnostic.level.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}${location}`,
    );
  }
  return lines;
}

function resultLine(report: CompatibilityReport): string {
  const actionable = actionableFindings(report).length;
  if (actionable > 0) {
    return "Result: compatibility issues found";
  }
  if (report.findings.length > 0) {
    return "Result: no actionable compatibility issues found (informational differences above)";
  }
  return "Result: no compatibility divergence detected";
}

export function renderCheckHuman(context: CliContext, report: CompatibilityReport): string {
  const lines: string[] = [];
  lines.push("PlaybookDiff");
  lines.push("");
  lines.push(`${harnessLabel(report.left.harness)} <-> ${harnessLabel(report.right.harness)}`);
  lines.push("");
  lines.push(`Repository: ${context.repository}`);
  lines.push(`Launch cwd: ${context.cwd}`);
  lines.push(`Target: ${context.targetPath ?? "(repository root)"}`);
  lines.push("");
  const { counts } = report.summary;
  lines.push(`Findings: ${counts.medium} medium, ${counts.low} low, ${counts.info} info`);
  lines.push("");

  if (report.findings.length === 0) {
    lines.push("No compatibility findings.");
  } else {
    for (const finding of report.findings) {
      lines.push(...renderFinding(finding));
      lines.push("");
    }
  }

  lines.push("Summary");
  for (const category of ["instruction", "skill", "mcp"] as const) {
    const summary = report.summary.byCategory[category];
    const label = CATEGORY_LABEL[category].padEnd(11);
    lines.push(
      summary === undefined
        ? `  ${label} n/a`
        : `  ${label} ${summary.equivalent} equivalent, ${summary.divergent} divergent, ${summary.unknown} unknown`,
    );
  }
  lines.push("");

  const diagnosticLines = [
    ...renderDiagnostics("claude", report.left.diagnostics),
    ...renderDiagnostics("codex", report.right.diagnostics),
  ];
  if (diagnosticLines.length > 0) {
    lines.push("Diagnostics");
    lines.push(...diagnosticLines);
    lines.push("");
  }

  lines.push(resultLine(report));
  return lines.join("\n");
}
