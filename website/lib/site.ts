export const site = {
  name: "PlaybookDiff",
  description:
    "Detect repository-configuration drift between Claude Code and Codex. Compare instructions, skills, MCP configuration, and Git regressions with deterministic evidence.",
  repository: "https://github.com/JacobisEpic/playbookdiff",
  baseline: "1bb33848fcd0f64ce9e6cdc9dcd380b6aef0b06b",
};

// Set this to the verified production origin after deployment, never a preview URL.
// Leaving it unset deliberately omits canonical/OG URLs rather than inventing a domain.
export const productionOrigin: string | undefined = undefined;

export const sourceUrl = (file: string, kind: "blob" | "tree" = "blob") =>
  `${site.repository}/${kind}/${site.baseline}/${file}`;
