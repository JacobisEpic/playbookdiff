import path from "node:path";

const codexFixturesRoot = path.join(
  import.meta.dirname,
  "..",
  "..",
  "harness-codex",
  "test",
  "fixtures",
);

/** Scenario A/B fixture: Codex is bounded to launch cwd while Claude discovers target descendants on demand. */
export const cwdTargetFixture: string = path.join(codexFixturesRoot, "cross-harness", "cwd-target");

/** Equivalent native layouts on both sides: 1 equivalent instruction/skill/MCP server, 0 findings. */
export const parityFixture: string = path.join(codexFixturesRoot, "comparison", "parity");

/** Different instruction prose at the same scope: 1 informational unknown, 0 claimed conflicts. */
export const semanticUnknownFixture: string = path.join(
  codexFixturesRoot,
  "comparison",
  "semantic-unknown",
);
