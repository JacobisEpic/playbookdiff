export const site = {
  name: "PlaybookDiff",
  description:
    "Detect repository-configuration drift between Claude Code and Codex. Compare instructions, skills, MCP configuration, and Git regressions with deterministic evidence.",
  repository: "https://github.com/JacobisEpic/playbookdiff",
  baseline: "2cdda6b15f30b12d26d6dee0fa5462aa88a60b6f",
};

// The verified production origin, never a preview or deployment-specific URL.
// Vercel's stable project alias, confirmed to return HTTP 200 anonymously.
export const productionOrigin: string | undefined = "https://playbookdiff.vercel.app";

export const sourceUrl = (file: string, kind: "blob" | "tree" = "blob") =>
  `${site.repository}/${kind}/${site.baseline}/${file}`;
