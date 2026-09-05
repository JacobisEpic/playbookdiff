export const site = {
  name: "PlaybookDiff",
  description:
    "See what Claude Code and Codex actually receive from the same repository, then catch newly introduced configuration drift with deterministic evidence.",
  repository: "https://github.com/JacobisEpic/playbookdiff",
  baseline: "2cdda6b15f30b12d26d6dee0fa5462aa88a60b6f",
  actionRef: "JacobisEpic/playbookdiff@v0",
  release: "v0.2.0",
};

// The verified production origin, never a preview or deployment-specific URL.
// Vercel's stable project alias, confirmed to return HTTP 200 anonymously.
// `tests/site.test.mjs` asserts the rendered canonical and og:url so this
// cannot silently regress to a preview URL or to `undefined`.
export const productionOrigin = "https://playbookdiff.vercel.app";

export const repositoryUrl = (file: string, kind: "blob" | "tree" = "blob") =>
  `${site.repository}/${kind}/main/${file}`;

export const evidenceUrl = (file: string, kind: "blob" | "tree" = "blob") =>
  `${site.repository}/${kind}/${site.baseline}/${file}`;

export type Receipt = {
  instructions: string[];
  skills: string[];
  notReceived: string[];
};

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

export const receiptSummary = (receipt: Receipt): string =>
  `${plural(receipt.instructions.length, "instruction")} · ${plural(receipt.skills.length, "skill")}`;
