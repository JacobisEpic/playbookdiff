import type { AnalysisContext, EffectiveAgentConfig } from "@playbookdiff/core/types";
import { IdRegistry } from "./diagnostics.js";
import { discoverInstructions } from "./instructions.js";
import { discoverMcpServers } from "./mcp.js";
import { toRepoRelativePosix, validateAnalysisContext } from "./paths.js";
import { discoverRules } from "./rules.js";
import { loadClaudeMdExcludes } from "./settings.js";
import { discoverSkills } from "./skills.js";

/**
 * Compiles the supported Claude Code repository configuration for
 * `context` into an evidence-backed `EffectiveAgentConfig`. Read-only: it
 * only reads files under `context.repositoryRoot`, never writes, and never
 * executes anything from the analyzed repository.
 */
export async function compileClaudeConfig(context: AnalysisContext): Promise<EffectiveAgentConfig> {
  const ctx = await validateAnalysisContext(context);
  const registry = new IdRegistry();

  const excludes = await loadClaudeMdExcludes(ctx.cwd, registry);

  const [instructionsResult, rulesResult, skillsResult, mcpResult] = await Promise.all([
    discoverInstructions(ctx, excludes, registry),
    discoverRules(ctx, excludes, registry),
    discoverSkills(ctx, registry),
    discoverMcpServers(ctx, registry),
  ]);

  const assumptions: string[] = [
    "Repo mode assumption: only reproducible repository-visible configuration is compiled. User, managed, and other machine-local Claude Code configuration (~/.claude/*, managed policy, runtime MCP state, interactive trust/approval state) is not represented and is not claimed to be absent.",
  ];
  if (ctx.mode === "local") {
    assumptions.push(
      'Local mode: CLAUDE.local.md is included with source.scope "local", but machine-external local sources (user CLAUDE.md, user skills, local settings, local MCP definitions) are still not discovered in Phase 2.',
    );
  }

  const target: AnalysisContext = {
    repositoryRoot: ".",
    cwd: toRepoRelativePosix(ctx.repositoryRoot, ctx.cwd),
    mode: ctx.mode,
    ...(ctx.targetPath !== undefined
      ? { targetPath: toRepoRelativePosix(ctx.repositoryRoot, ctx.targetPath) }
      : {}),
  };

  return {
    harness: "claude",
    target,
    instructions: [...instructionsResult.instructions, ...rulesResult.instructions],
    skills: skillsResult.skills,
    mcpServers: mcpResult.mcpServers,
    provenance: [
      ...instructionsResult.provenance,
      ...rulesResult.provenance,
      ...skillsResult.provenance,
      ...mcpResult.provenance,
    ],
    diagnostics: [
      ...excludes.diagnostics,
      ...instructionsResult.diagnostics,
      ...rulesResult.diagnostics,
      ...skillsResult.diagnostics,
      ...mcpResult.diagnostics,
    ],
    assumptions,
  };
}
