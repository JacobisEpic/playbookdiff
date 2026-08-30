import { promises as fs } from "node:fs";

export type ResolvedRevisions = { baseline: string; candidate: string };
export type RevisionResolutionFailure = { error: string };

function readStringField(value: unknown, key: string): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.length > 0 ? field : undefined;
}

/**
 * Extracts `pull_request.base.sha`/`pull_request.head.sha` from a GitHub
 * webhook event payload. Deliberately does not use `github.sha`: for
 * `pull_request` events that resolves to GitHub's synthetic merge-preview
 * commit, not the actual PR head, which would silently analyze the wrong
 * candidate.
 */
export function extractPullRequestShas(
  event: unknown,
): { baseSha: string; headSha: string } | undefined {
  if (typeof event !== "object" || event === null) return undefined;
  const pullRequest = (event as Record<string, unknown>).pull_request;
  if (typeof pullRequest !== "object" || pullRequest === null) return undefined;
  const record = pullRequest as Record<string, unknown>;
  const baseSha = readStringField(record.base, "sha");
  const headSha = readStringField(record.head, "sha");
  if (baseSha === undefined || headSha === undefined) return undefined;
  return { baseSha, headSha };
}

/**
 * Reads and parses the GitHub Actions event payload file. Returns
 * `undefined` (never throws) when the path is unset, unreadable, or not
 * valid JSON, so callers degrade to "no PR context available" instead of
 * crashing on an unusual trigger context.
 */
export async function readEventFromPath(eventPath: string | undefined): Promise<unknown> {
  if (eventPath === undefined || eventPath.length === 0) return undefined;
  try {
    const raw = await fs.readFile(eventPath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Explicit `baseline`/`candidate` inputs always take precedence, per field.
 * Otherwise, on a `pull_request` event, the PR's base/head commits are used.
 * Anywhere else, an unresolvable side is reported as a clean, actionable
 * error rather than guessing (e.g. falling back to `HEAD~1`).
 */
export function resolveRevisions(options: {
  explicitBaseline?: string;
  explicitCandidate?: string;
  eventName?: string;
  event?: unknown;
}): ResolvedRevisions | RevisionResolutionFailure {
  const prShas =
    options.eventName === "pull_request" ? extractPullRequestShas(options.event) : undefined;

  const baseline = options.explicitBaseline ?? prShas?.baseSha;
  const candidate = options.explicitCandidate ?? prShas?.headSha;

  if (baseline !== undefined && candidate !== undefined) {
    return { baseline, candidate };
  }

  const missingNames: string[] = [];
  if (baseline === undefined) missingNames.push("baseline");
  if (candidate === undefined) missingNames.push("candidate");
  const missing = missingNames.join(" and ");
  const inputList = missingNames.map((name) => `"${name}"`).join(" and ");

  const guidance =
    options.eventName === "pull_request"
      ? `Could not read pull_request.base.sha/pull_request.head.sha from the event payload. Provide the ${inputList} input${missingNames.length > 1 ? "s" : ""} explicitly.`
      : `Automatic detection is only supported on "pull_request" events (current event: "${options.eventName ?? "unknown"}"). Provide the "baseline" and "candidate" inputs explicitly.`;

  return {
    error: `PlaybookDiff could not determine the ${missing} revision. ${guidance}`,
  };
}
