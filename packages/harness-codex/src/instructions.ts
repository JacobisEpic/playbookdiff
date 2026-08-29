import path from "node:path";
import type {
  Diagnostic,
  EffectiveInstruction,
  ProvenanceRecord,
  SourceRef,
} from "@playbookdiff/core/types";
import type { CodexConfig } from "./config.js";
import { createDiagnostic, type IdRegistry } from "./diagnostics.js";
import {
  getAncestorChain,
  lineCount,
  readFileIfExists,
  toRepoRelativePosix,
  type ValidatedContext,
} from "./paths.js";

export type InstructionDiscoveryResult = {
  instructions: EffectiveInstruction[];
  provenance: ProvenanceRecord[];
  diagnostics: Diagnostic[];
};

type Candidate = { content: string; source: SourceRef; fallback: boolean };

export async function discoverInstructions(
  ctx: ValidatedContext,
  config: CodexConfig,
  registry: IdRegistry,
): Promise<InstructionDiscoveryResult> {
  const instructions: EffectiveInstruction[] = [];
  const provenance: ProvenanceRecord[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const directory of getAncestorChain(ctx.repositoryRoot, ctx.cwd)) {
    const filenames = [
      "AGENTS.override.md",
      "AGENTS.md",
      ...config.fallbackFilenames.value.filter(
        (name) => name !== "AGENTS.override.md" && name !== "AGENTS.md",
      ),
    ];
    const candidates: Candidate[] = [];
    for (const filename of filenames) {
      const absolutePath = path.join(directory, filename);
      const content = await readFileIfExists(absolutePath);
      if (content === undefined || content.trim().length === 0) continue;
      const relativePath = toRepoRelativePosix(ctx.repositoryRoot, absolutePath);
      candidates.push({
        content,
        fallback: filename !== "AGENTS.override.md" && filename !== "AGENTS.md",
        source: {
          path: relativePath,
          lineStart: 1,
          lineEnd: lineCount(content),
          scope: directory === ctx.repositoryRoot ? "repository" : "directory",
          format: "markdown",
        },
      });
    }
    const selected = candidates[0];
    if (!selected) continue;
    const id = registry.unique(`codex:instruction:${selected.source.path}`);
    instructions.push({
      id,
      content: selected.content,
      source: selected.source,
      scope: { appliesTo: [toRepoRelativePosix(ctx.repositoryRoot, directory)] },
      loadPhase: "startup",
      order: instructions.length,
    });
    provenance.push({
      effectiveId: id,
      sources: [selected.source, ...(selected.fallback ? [config.fallbackFilenames.source] : [])],
      resolution: {
        strategy: directory === ctx.repositoryRoot ? "matched" : "inherited",
        ...(candidates.length > 1
          ? { overriddenSources: candidates.slice(1).map((candidate) => candidate.source) }
          : {}),
      },
    });
  }

  const totalBytes = instructions.reduce(
    (total, instruction) => total + Buffer.byteLength(instruction.content, "utf8"),
    0,
  );
  const totalWithBlankLineSeparators = totalBytes + Math.max(0, instructions.length - 1) * 2;
  if (totalWithBlankLineSeparators > config.maxBytes.value) {
    diagnostics.push(
      createDiagnostic(registry, {
        level: "warning",
        code: "unresolved",
        slug: "project-doc-byte-limit",
        message: `Discovered instruction candidates total ${totalBytes} content bytes (${totalWithBlankLineSeparators} including documented blank-line separators), exceeding project_doc_max_bytes (${config.maxBytes.value}). Current official Codex documentation conflicts on whether this limit is aggregate or per file, so PlaybookDiff preserves every candidate and does not guess which content Codex truncates or omits.`,
        source: config.maxBytes.source,
      }),
    );
  }

  return { instructions, provenance, diagnostics };
}
