export const site = {
  name: "PlaybookDiff",
  description:
    "Check that Claude Code and Codex receive the same repository configuration, then catch new gaps in CI.",
  repository: "https://github.com/JacobisEpic/playbookdiff",
  baseline: "2cdda6b15f30b12d26d6dee0fa5462aa88a60b6f",
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
// cannot quietly change meaning under the claim it supports.
export const evidenceUrl = (file: string, kind: "blob" | "tree" = "blob") =>
  `${site.repository}/${kind}/${site.baseline}/${file}`;

export const npmUrl = `https://www.npmjs.com/package/${site.npmPackage}`;

// Official harness documentation, cited where the site describes what a
// harness does rather than what PlaybookDiff does.
export const officialDocs = {
  claudeMemory: "https://code.claude.com/docs/en/memory",
  claudeSkills: "https://code.claude.com/docs/en/slash-commands",
  codexAgentsMd: "https://learn.chatgpt.com/docs/agent-configuration/agents-md",
  codexSkills: "https://learn.chatgpt.com/docs/build-skills",
};
