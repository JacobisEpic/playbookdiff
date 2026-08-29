import path from "node:path";
import type {
  Diagnostic,
  EffectiveInstruction,
  ProvenanceRecord,
  SourceRef,
} from "@playbookdiff/core/types";
import { createDiagnostic, type IdRegistry } from "./diagnostics.js";
import { extractImports } from "./markdown.js";
import {
  buildLineIndex,
  getAncestorChain,
  getDescendantChain,
  positionAt,
  readFileIfExists,
  resolveCandidate,
  targetDirectory,
  toRepoRelativePosix,
  type ValidatedContext,
} from "./paths.js";
import type { ExcludeMatcher } from "./settings.js";

/** Documented recursion limit for `@path` imports. */
const MAX_IMPORT_DEPTH = 4;

export type InstructionDiscoveryResult = {
  instructions: EffectiveInstruction[];
  provenance: ProvenanceRecord[];
  diagnostics: Diagnostic[];
};

type ImportChain = { visited: Set<string>; depth: number };
type LoadPhase = "startup" | "on-demand";
type SourceScope = "repository" | "local";

export async function discoverInstructions(
  ctx: ValidatedContext,
  excludes: ExcludeMatcher,
  registry: IdRegistry,
): Promise<InstructionDiscoveryResult> {
  const instructions: EffectiveInstruction[] = [];
  const provenance: ProvenanceRecord[] = [];
  const diagnostics: Diagnostic[] = [];
  let orderCounter = 0;
  const nextOrder = (): number => {
    const current = orderCounter;
    orderCounter += 1;
    return current;
  };

  function relPath(absolutePath: string): string {
    return toRepoRelativePosix(ctx.repositoryRoot, absolutePath);
  }

  function wholeFileSource(absolutePath: string, scope: SourceScope): SourceRef {
    return { path: relPath(absolutePath), scope, format: "markdown" };
  }

  async function processDirectory(dir: string, loadPhase: LoadPhase): Promise<void> {
    const candidates: Array<{ absolutePath: string; scope: SourceScope }> = [
      { absolutePath: path.join(dir, "CLAUDE.md"), scope: "repository" },
      { absolutePath: path.join(dir, ".claude", "CLAUDE.md"), scope: "repository" },
    ];
    for (const candidate of candidates) {
      const content = await readFileIfExists(candidate.absolutePath);
      if (content !== undefined) {
        await handleFile(candidate.absolutePath, content, candidate.scope, loadPhase);
      }
    }

    const localPath = path.join(dir, "CLAUDE.local.md");
    const localContent = await readFileIfExists(localPath);
    if (localContent !== undefined) {
      if (ctx.mode === "repo") {
        diagnostics.push(
          createDiagnostic(registry, {
            level: "info",
            code: "local-config-unavailable",
            slug: `claude-local-md:${relPath(localPath)}`,
            message:
              "A CLAUDE.local.md local-instruction source exists at this path. It is excluded from repo-mode output because it is a personal, conventionally git-ignored override, not reproducible repository-defined configuration.",
            source: wholeFileSource(localPath, "local"),
          }),
        );
      } else {
        await handleFile(localPath, localContent, "local", loadPhase);
      }
    }
  }

  async function handleFile(
    absolutePath: string,
    content: string,
    scope: SourceScope,
    loadPhase: LoadPhase,
  ): Promise<void> {
    if (excludes.matches(absolutePath)) {
      diagnostics.push(
        createDiagnostic(registry, {
          level: "info",
          code: "other",
          slug: `excluded:${relPath(absolutePath)}`,
          message: `Excluded by claudeMdExcludes: ${relPath(absolutePath)}`,
          source: wholeFileSource(absolutePath, scope),
        }),
      );
      return;
    }
    await expandFile({
      absolutePath,
      content,
      scope,
      loadPhase,
      chain: { visited: new Set([absolutePath]), depth: 0 },
      importReference: undefined,
    });
  }

  async function expandFile(params: {
    absolutePath: string;
    content: string;
    scope: SourceScope;
    loadPhase: LoadPhase;
    chain: ImportChain;
    importReference: SourceRef | undefined;
  }): Promise<void> {
    const { absolutePath, content, scope, loadPhase, chain, importReference } = params;
    const file = relPath(absolutePath);
    const lineIndex = buildLineIndex(content);
    const imports = extractImports(content);

    let segmentIndex = 0;
    let cursor = 0;
    let firstSegmentEmitted = false;

    const emitSegment = (text: string, endOffsetExclusive: number): void => {
      if (text.trim().length === 0) {
        // Purely-whitespace gaps between/around imports (e.g. a lone newline
        // left after an import token) carry no instructional content, so no
        // EffectiveInstruction is manufactured for them. Substantive segments
        // still preserve their exact text, including surrounding whitespace.
        return;
      }
      const startPos = positionAt(lineIndex, cursor);
      const endPos = positionAt(lineIndex, endOffsetExclusive);
      const source: SourceRef = {
        path: file,
        lineStart: startPos.line,
        lineEnd: endPos.line,
        scope,
        format: "markdown",
      };
      const id = registry.unique(`claude:instruction:${file}#seg${segmentIndex}`);
      segmentIndex += 1;
      const order = nextOrder();
      instructions.push({
        id,
        content: text,
        source,
        scope: { appliesTo: ["."] },
        loadPhase,
        order,
      });
      const sources =
        !firstSegmentEmitted && importReference ? [source, importReference] : [source];
      firstSegmentEmitted = true;
      provenance.push({
        effectiveId: id,
        sources,
        resolution: { strategy: importReference ? "inherited" : "matched" },
      });
    };

    for (const match of imports) {
      emitSegment(content.slice(cursor, match.offsetStart), match.offsetStart);
      const refPos = positionAt(lineIndex, match.offsetStart);
      const refSource: SourceRef = {
        path: file,
        lineStart: refPos.line,
        lineEnd: refPos.line,
        scope,
        format: "markdown",
      };
      await resolveImport(match.target, absolutePath, chain, loadPhase, refSource);
      cursor = match.offsetEnd;
    }
    emitSegment(content.slice(cursor), content.length);
  }

  async function resolveImport(
    target: string,
    fromAbsolutePath: string,
    chain: ImportChain,
    loadPhase: LoadPhase,
    refSource: SourceRef,
  ): Promise<void> {
    const from = relPath(fromAbsolutePath);
    if (chain.depth + 1 > MAX_IMPORT_DEPTH) {
      diagnostics.push(
        createDiagnostic(registry, {
          level: "warning",
          code: "unresolved",
          slug: `import-depth:${from}:${target}`,
          message: `Import "${target}" exceeds the documented four-hop import depth and was not followed.`,
          source: refSource,
        }),
      );
      return;
    }

    const fromDir = path.dirname(fromAbsolutePath);
    const resolved = await resolveCandidate(ctx.repositoryRoot, fromDir, target);

    if (!resolved.insideRoot) {
      diagnostics.push(
        createDiagnostic(registry, {
          level: "info",
          code: "outside-repository",
          slug: `import-outside:${from}:${target}`,
          message: `Import "${target}" resolves outside the repository and is not followed in repo mode.`,
          source: refSource,
        }),
      );
      return;
    }
    if (!resolved.exists) {
      diagnostics.push(
        createDiagnostic(registry, {
          level: "warning",
          code: "unresolved",
          slug: `import-missing:${from}:${target}`,
          message: `Import "${target}" does not resolve to an existing file.`,
          source: refSource,
        }),
      );
      return;
    }
    if (chain.visited.has(resolved.absolutePath)) {
      diagnostics.push(
        createDiagnostic(registry, {
          level: "warning",
          code: "other",
          slug: `import-cycle:${from}:${target}`,
          message: `Import "${target}" would create a cycle. PlaybookDiff stopped recursion here as analyzer safety behavior; this is not a verified claim about Claude Code's own cycle handling.`,
          source: refSource,
        }),
      );
      return;
    }

    const importedContent = await readFileIfExists(resolved.absolutePath);
    if (importedContent === undefined) {
      diagnostics.push(
        createDiagnostic(registry, {
          level: "warning",
          code: "unresolved",
          slug: `import-unreadable:${from}:${target}`,
          message: `Import "${target}" could not be read.`,
          source: refSource,
        }),
      );
      return;
    }

    const importedAbsolutePath = resolved.absolutePath;
    if (excludes.matches(importedAbsolutePath)) {
      diagnostics.push(
        createDiagnostic(registry, {
          level: "info",
          code: "other",
          slug: `excluded:${relPath(importedAbsolutePath)}`,
          message: `Excluded by claudeMdExcludes: ${relPath(importedAbsolutePath)}`,
          source: wholeFileSource(importedAbsolutePath, "repository"),
        }),
      );
      return;
    }

    const nextChain: ImportChain = {
      visited: new Set(chain.visited).add(importedAbsolutePath),
      depth: chain.depth + 1,
    };
    await expandFile({
      absolutePath: importedAbsolutePath,
      content: importedContent,
      scope: "repository",
      loadPhase,
      chain: nextChain,
      importReference: refSource,
    });
  }

  const ancestorChain = getAncestorChain(ctx.repositoryRoot, ctx.cwd);
  for (const dir of ancestorChain) {
    await processDirectory(dir, "startup");
  }

  if (ctx.targetPath) {
    const targetDir = await targetDirectory(ctx.targetPath);
    const descendantChain = getDescendantChain(ctx.cwd, targetDir);
    for (const dir of descendantChain) {
      await processDirectory(dir, "on-demand");
    }
  }

  return { instructions, provenance, diagnostics };
}
