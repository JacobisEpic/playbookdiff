export const site = {
  name: "PlaybookDiff",
  description:
    "Check that Claude Code and Codex receive the same repository configuration, then catch new gaps in CI.",
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

// The product walkthrough is recorded but not yet cut. Until `src` is set the
// section renders a plain reserved frame, with no invented chrome, timecode, or
// play control. The type keeps captions and the film together, so the video can
// never ship without them.
export type Walkthrough = { src: null } | { src: string; captions: string; poster: string | null };

export const walkthrough: Walkthrough = { src: null };

export const repositoryUrl = (file: string, kind: "blob" | "tree" = "blob") =>
  `${site.repository}/${kind}/main/${file}`;

export const evidenceUrl = (file: string, kind: "blob" | "tree" = "blob") =>
  `${site.repository}/${kind}/${site.baseline}/${file}`;
