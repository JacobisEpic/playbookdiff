import type { CompatibilityFinding, FindingCategory, FindingType } from "@playbookdiff/core";
import type { DiffJsonOutput } from "playbookdiff";

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

/**
 * Escapes Markdown metacharacters in text that may come from analyzed
 * repository content (instruction prose, file paths, a fork PR's own
 * branch-derived revision label). Deliberately narrow: it neutralizes
 * syntax that could break this summary's structure or inject formatting/
 * links, without mangling ordinary punctuation with backslashes.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]<>|]/g, (char) => `\\${char}`);
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function shortSha(commit: string): string {
  return commit.slice(0, 7);
}

function findingTitle(finding: CompatibilityFinding): string {
  return `${CATEGORY_LABEL[finding.category]} ${TYPE_LABEL[finding.type]}`;
}

function renderFindingMarkdown(finding: CompatibilityFinding): string[] {
  const lines: string[] = [];
  lines.push(`### ${finding.severity.toUpperCase()} — ${findingTitle(finding)}`);
  lines.push("");
  lines.push(escapeMarkdown(finding.explanation));
  if (finding.evidence.length > 0) {
    lines.push("");
    lines.push("**Evidence:**");
    lines.push("");
    for (const evidence of finding.evidence) {
      const location =
        evidence.source.lineStart !== undefined
          ? `${evidence.source.path}:${evidence.source.lineStart}`
          : evidence.source.path;
      const reason = evidence.reason !== undefined ? `${escapeMarkdown(evidence.reason)}: ` : "";
      const excerpt =
        evidence.excerpt !== undefined ? ` — "${escapeMarkdown(evidence.excerpt)}"` : "";
      lines.push(`- ${reason}${escapeMarkdown(location)} (${evidence.source.scope})${excerpt}`);
    }
  }
  lines.push("");
  lines.push(`Finding ID: \`${finding.id}\``);
  return lines;
}

/**
 * States what the run covered.
 *
 * A reader needs this to interpret a green result: "no new regressions" means
 * nothing new appeared in the contexts listed here, and saying which contexts
 * those were is the difference between a claim about a pull request and a claim
 * about a whole repository.
 */
export function renderAnalyzedLine(json: DiffJsonOutput): string {
  const { analyzed } = json;
  if (!analyzed.derived) {
    const target = analyzed.targets[0]?.path ?? json.context.targetPath;
    return target !== undefined
      ? `the requested target \`${escapeMarkdown(target)}\``
      : "the repository-root startup context";
  }
  const scopes = analyzed.targets.filter((target) => target.path !== undefined);
  const base =
    scopes.length === 0
      ? `the repository-root startup context (${plural(analyzed.changedPathCount, "changed path")}, no nested scope affected)`
      : `the repository-root startup context and ${plural(scopes.length, "changed scope")}, derived from ${plural(analyzed.changedPathCount, "changed path")}`;
  return analyzed.omitted > 0
    ? `${base}; ${analyzed.omitted} further scopes were not analyzed`
    : base;
}

/**
 * Renders a deterministic GitHub Step Summary in Markdown from the same
 * `diff --json` contract the CLI already produces. Contains no comparison
 * or actionability logic: `summary.introducedActionable` (already computed
 * by `playbookdiff diff`) is the sole basis for the pass/fail framing here.
 */
export function renderStepSummary(json: DiffJsonOutput): string {
  const { summary } = json.diff;
  const lines: string[] = [];

  lines.push("# PlaybookDiff");
  lines.push("");
  lines.push("Claude Code ↔ Codex compatibility regression check");
  lines.push("");
  lines.push(`**Repository:** ${escapeMarkdown(json.context.repository)}`);
  lines.push(
    `**Baseline:** ${escapeMarkdown(json.baseline.revision)} (\`${shortSha(json.baseline.commit)}\`)`,
  );
  lines.push(
    `**Candidate:** ${escapeMarkdown(json.candidate.revision)} (\`${shortSha(json.candidate.commit)}\`)`,
  );
  lines.push(`**Launch cwd:** ${escapeMarkdown(json.context.cwd)}`);
  lines.push(`**Analyzed:** ${renderAnalyzedLine(json)}`);
  lines.push("");

  lines.push("## Result");
  lines.push("");
  if (summary.introducedActionable > 0) {
    lines.push(
      `❌ ${plural(summary.introducedActionable, "new actionable compatibility regression")}`,
    );
  } else {
    lines.push("✅ No new actionable Claude Code ↔ Codex compatibility regressions.");
  }
  lines.push("");
  const notes: string[] = [];
  if (summary.introducedInformational > 0) {
    notes.push(`${plural(summary.introducedInformational, "new informational finding")}`);
  }
  if (summary.resolved > 0) notes.push(`${plural(summary.resolved, "resolved finding")}`);
  if (summary.unchanged > 0) {
    notes.push(`${plural(summary.unchanged, "pre-existing finding")} remain unchanged`);
  }
  for (const note of notes) lines.push(`- ${note}`);
  if (notes.length > 0) lines.push("");

  if (json.diff.introduced.length > 0) {
    lines.push("## Introduced");
    lines.push("");
    for (const finding of json.diff.introduced) {
      lines.push(...renderFindingMarkdown(finding));
      lines.push("");
    }
  }

  if (json.diff.resolved.length > 0) {
    lines.push("## Resolved");
    lines.push("");
    lines.push(`${plural(json.diff.resolved.length, "finding")} resolved.`);
    lines.push("");
  }

  if (summary.unchanged > 0) {
    lines.push("## Existing");
    lines.push("");
    lines.push(`${plural(summary.unchanged, "pre-existing finding")} remain unchanged.`);
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
