import type { AnalysisContext, EffectiveAgentConfig } from "@playbookdiff/core/types";
import { loadCodexConfig } from "./config.js";
import { createDiagnostic, IdRegistry } from "./diagnostics.js";
import { discoverInstructions } from "./instructions.js";
import { discoverMcpServers } from "./mcp.js";
import { toRepoRelativePosix, validateAnalysisContext } from "./paths.js";
import { discoverSkills } from "./skills.js";

export async function compileCodexConfig(context: AnalysisContext): Promise<EffectiveAgentConfig> {
  const ctx = await validateAnalysisContext(context);
  const registry = new IdRegistry();
  const config = await loadCodexConfig(ctx, registry);
  const instructions = await discoverInstructions(ctx, config, registry);
  const skills = await discoverSkills(ctx, config, registry);
  const mcp = discoverMcpServers(config, registry);

  const diagnostics = [
    ...config.diagnostics,
    ...instructions.diagnostics,
    ...skills.diagnostics,
    ...mcp.diagnostics,
    createDiagnostic(registry, {
      level: "info",
      code: "local-config-unavailable",
      slug: "user-codex-layer",
      message:
        "User-level Codex configuration, user skills, and other machine-local state are outside repository-only analysis and are not claimed to be absent.",
    }),
    createDiagnostic(registry, {
      level: "info",
      code: "managed-config-unavailable",
      slug: "managed-codex-layer",
      message:
        "Managed Codex configuration is outside repository-only analysis and may override or constrain repository-visible behavior.",
    }),
  ];

  if (config.rootMarkers) {
    diagnostics.push(
      createDiagnostic(registry, {
        level: "info",
        code: "assumption",
        slug: "explicit-repository-root",
        message:
          "project_root_markers is present, but AnalysisContext.repositoryRoot is the explicit analysis boundary. PlaybookDiff records the setting without searching beyond or redefining that boundary.",
        source: config.rootMarkers.source,
      }),
    );
  }

  if (config.maxBytes.source.format === "toml") {
    diagnostics.push(
      createDiagnostic(registry, {
        level: "info",
        code: "other",
        slug: "configured-project-doc-max-bytes",
        message: `Applicable repository configuration sets project_doc_max_bytes to ${config.maxBytes.value}.`,
        source: config.maxBytes.source,
      }),
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
    harness: "codex",
    target,
    instructions: instructions.instructions,
    skills: skills.skills,
    mcpServers: mcp.mcpServers,
    provenance: [...instructions.provenance, ...skills.provenance, ...mcp.provenance],
    diagnostics,
    assumptions: [
      "AnalysisContext.repositoryRoot is treated as the Codex project root; PlaybookDiff does not discover or redefine a root outside the caller-provided boundary.",
      "Applicable repository .codex/config.toml layers are assumed trusted. Codex ignores project configuration in untrusted projects, but interactive trust state is not repository-visible.",
      "This Phase 3 implementation compiles repository-visible state only in both analysis modes. User, managed, runtime, and interactive approval state are intentionally not inspected.",
    ],
  };
}
