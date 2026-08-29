import type { CompatibilityFinding, Evidence, FindingSide, HarnessId } from "@playbookdiff/core";
import type { CliContext } from "./context.js";

function harnessLabel(harness: HarnessId): string {
  return harness === "claude" ? "Claude Code" : "Codex";
}

function renderSide(
  label: string,
  side: FindingSide | undefined,
  evidence: readonly Evidence[],
): string[] {
  const lines = [label];
  if (side === undefined) {
    lines.push("  (not compared)");
    return lines;
  }
  lines.push(`  present: ${side.present ? "yes" : "no"}`);
  if (side.detail !== undefined) lines.push(`  detail: ${side.detail}`);
  if (evidence.length === 0) {
    lines.push("  source: (none)");
  } else {
    for (const item of evidence) {
      const location =
        item.source.lineStart !== undefined
          ? `${item.source.path}:${item.source.lineStart}`
          : item.source.path;
      lines.push(`  source: ${location} (${item.source.scope})`);
      if (item.excerpt !== undefined) lines.push(`    "${item.excerpt}"`);
    }
  }
  return lines;
}

export function renderExplainHuman(
  context: CliContext,
  finding: CompatibilityFinding,
  harnesses: { left: HarnessId; right: HarnessId },
): string {
  const lines: string[] = [];
  lines.push(`Finding: ${finding.id}`);
  lines.push(`Severity: ${finding.severity}`);
  lines.push(`Kind: ${finding.type}`);
  lines.push(`Entity: ${finding.category}`);
  lines.push(`Confidence: ${finding.confidence}`);
  lines.push("");
  lines.push(`Repository: ${context.repository}`);
  lines.push(`Launch cwd: ${context.cwd}`);
  lines.push(`Target: ${context.targetPath ?? "(repository root)"}`);
  lines.push("");

  const leftEvidence = finding.evidence.filter((e) =>
    e.reason?.startsWith(harnessLabel(harnesses.left)),
  );
  const rightEvidence = finding.evidence.filter((e) =>
    e.reason?.startsWith(harnessLabel(harnesses.right)),
  );
  const otherEvidence = finding.evidence.filter(
    (e) => !leftEvidence.includes(e) && !rightEvidence.includes(e),
  );

  lines.push(...renderSide(harnessLabel(harnesses.left), finding.left, leftEvidence));
  lines.push("");
  lines.push(...renderSide(harnessLabel(harnesses.right), finding.right, rightEvidence));
  lines.push("");

  lines.push("Why PlaybookDiff reported this");
  lines.push(`  ${finding.explanation}`);
  lines.push("");

  if (otherEvidence.length > 0) {
    lines.push("Additional evidence");
    for (const item of otherEvidence) {
      const location =
        item.source.lineStart !== undefined
          ? `${item.source.path}:${item.source.lineStart}`
          : item.source.path;
      lines.push(`  - ${item.reason ?? "evidence"}: ${location} (${item.source.scope})`);
      if (item.excerpt !== undefined) lines.push(`    "${item.excerpt}"`);
    }
    lines.push("");
  }

  if (finding.type === "unknown") {
    lines.push("What PlaybookDiff does NOT know");
    lines.push(
      "  PlaybookDiff has proved that this content differs. It does not evaluate semantic equivalence, prose conflict, or behavioral consequence, so this remains deterministically unknown rather than a claimed conflict.",
    );
  }

  return lines.join("\n");
}
