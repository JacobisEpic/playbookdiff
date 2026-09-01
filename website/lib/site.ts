export const site = {
  name: "PlaybookDiff",
  description:
    "Detect repository-configuration drift between Claude Code and Codex. Compare instructions, skills, MCP configuration, and Git regressions with deterministic evidence.",
  repository: "https://github.com/JacobisEpic/playbookdiff",
  baseline: "2cdda6b15f30b12d26d6dee0fa5462aa88a60b6f",
};

// Set this to the verified production origin after deployment, never a preview URL.
// Leaving it unset deliberately omits canonical/OG URLs rather than inventing a domain.
export const productionOrigin: string | undefined = undefined;

export const sourceUrl = (file: string, kind: "blob" | "tree" = "blob") =>
  `${site.repository}/${kind}/${site.baseline}/${file}`;
