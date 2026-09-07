export const site = {
  name: "PlaybookDiff",
  description:
    "Check that Claude Code and Codex receive the same repository configuration, then catch new gaps in CI.",
  repository: "https://github.com/JacobisEpic/playbookdiff",
  actionRef: "JacobisEpic/playbookdiff@v0",
  release: "v0.2.0",
  npmPackage: "playbookdiff",
};

// The canonical public origin. Vercel still serves the project alias behind
// this, but `playbookdiff.dev` is the site's identity: it drives metadataBase,
// the canonical link, og:url, the sitemap, and robots.
// `tests/site.test.mjs` asserts the rendered metadata so this cannot regress to
// a preview URL, a deployment alias, or `undefined`.
export const productionOrigin = "https://playbookdiff.dev";

export const repositoryUrl = (file: string, kind: "blob" | "tree" = "blob") =>
  `${site.repository}/${kind}/main/${file}`;

// Evidence links are pinned to a commit, so a fixture or test the site cites
// cannot quietly change meaning under the claim it supports. The commit comes
// from `lib/effective-scope.json`, which the generator only writes after
// proving every cited file is byte-identical at it.
export const evidenceUrl = (commit: string, file: string, kind: "blob" | "tree" = "blob") =>
  `${site.repository}/${kind}/${commit}/${file}`;

export const npmUrl = `https://www.npmjs.com/package/${site.npmPackage}`;

// Declaring `openGraph` on a page replaces the layout's object rather than
// merging into it, so every route builds its card from this one shape and only
// varies the URL.
export const openGraph = (path = "", title = site.name) => ({
  title,
  description: site.description,
  siteName: site.name,
  type: "website" as const,
  url: `${productionOrigin}${path}`,
  images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: site.name }],
});

// Official harness documentation, cited where the site describes what a
// harness does rather than what PlaybookDiff does.
export const officialDocs = {
  claudeMemory: "https://code.claude.com/docs/en/memory",
  claudeSkills: "https://code.claude.com/docs/en/slash-commands",
  codexAgentsMd: "https://learn.chatgpt.com/docs/agent-configuration/agents-md",
  codexSkills: "https://learn.chatgpt.com/docs/build-skills",
};
