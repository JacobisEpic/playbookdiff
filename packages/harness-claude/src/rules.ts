import { promises as fs } from "node:fs";
import path from "node:path";
import picomatch from "picomatch";
import type {
  Diagnostic,
  EffectiveInstruction,
  ProvenanceRecord,
  SourceRef,
} from "@playbookdiff/core/types";
import { createDiagnostic, type IdRegistry } from "./diagnostics.js";
import { extractFrontmatter } from "./markdown.js";
import {
  getAncestorChain,
  getDescendantChain,
  readFileIfExists,
  resolveCandidate,
  targetDirectory,
  toRepoRelativePosix,
  type ValidatedContext,
} from "./paths.js";
import type { ExcludeMatcher } from "./settings.js";

export type RuleDiscoveryResult = {
  instructions: EffectiveInstruction[];
  provenance: ProvenanceRecord[];
  diagnostics: Diagnostic[];
};

/**
 * Matches a repo-relative POSIX target path against Claude rule/skill `paths`
 * glob patterns, anchored to the project root - confirmed by the official
 * docs table (`*.md` matches only project-root Markdown, `src/**\/*` is
 * project-relative), not a PlaybookDiff-invented convention. An invalid
 * pattern (e.g. an unescaped bracket expression) matches nothing rather than
 * throwing, matching documented behavior.
 */
export function matchesClaudeRulePath(patterns: string[], targetRepoRelativePath: string): boolean {
  return patterns.some((pattern) => {
    try {
      const isMatch = picomatch(pattern, { dot: true, windows: false });
      return isMatch(targetRepoRelativePath);
    } catch {
      return false;
    }
  });
}

async function listMarkdownFilesRecursive(
  dir: string,
  repositoryRoot: string,
  outsideRepository: string[],
): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(
        ...(await listMarkdownFilesRecursive(entryPath, repositoryRoot, outsideRepository)),
      );
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(entryPath);
    } else if (entry.isSymbolicLink() && entry.name.endsWith(".md")) {
      // A `Dirent` reports a symlink-to-file as a symlink, not a file, so a
      // rule shared by symlink would otherwise be dropped with no trace even
      // though Claude Code reads it at this path. Only a link that stays inside
      // the repository is followed; one that escapes is recorded so the caller
      // can diagnose it rather than omit it silently. A symlinked *directory*
      // is deliberately not recursed into - doing so safely needs a cycle rule
      // this adapter has no documented basis for.
      const resolved = await resolveCandidate(repositoryRoot, dir, entry.name);
      if (!resolved.exists) {
        continue;
      }
      if (!resolved.insideRoot) {
        outsideRepository.push(entryPath);
        continue;
      }
      if (await isFile(resolved.absolutePath)) {
        files.push(entryPath);
      }
    }
  }
  return files;
}

async function isFile(absolutePath: string): Promise<boolean> {
  try {
    return (await fs.stat(absolutePath)).isFile();
  } catch {
    return false;
  }
}

/** Reads a `paths` frontmatter field (string list, comma-separated string, or absent) shared by rules and skills. */
export function readPathsField(data: Record<string, unknown> | undefined): string[] | undefined {
  const value = data?.paths;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return undefined;
}

export async function discoverRules(
  ctx: ValidatedContext,
  excludes: ExcludeMatcher,
  registry: IdRegistry,
): Promise<RuleDiscoveryResult> {
  const instructions: EffectiveInstruction[] = [];
  const provenance: ProvenanceRecord[] = [];
  const diagnostics: Diagnostic[] = [];

  function relPath(absolutePath: string): string {
    return toRepoRelativePosix(ctx.repositoryRoot, absolutePath);
  }

  const targetRelPath = ctx.targetPath ? relPath(ctx.targetPath) : undefined;

  const ancestorChain = getAncestorChain(ctx.repositoryRoot, ctx.cwd);
  for (const dir of ancestorChain) {
    const rulesRoot = path.join(dir, ".claude", "rules");
    const outsideRepository: string[] = [];
    const files = await listMarkdownFilesRecursive(
      rulesRoot,
      ctx.repositoryRoot,
      outsideRepository,
    );
    for (const escaped of outsideRepository) {
      diagnostics.push(
        createDiagnostic(registry, {
          level: "info",
          code: "outside-repository",
          slug: `rule-symlink:${relPath(escaped)}`,
          message: `Rule ${relPath(escaped)} is a symlink resolving outside repositoryRoot and was not followed.`,
          source: { path: relPath(escaped), scope: "repository", format: "markdown" },
        }),
      );
    }
    for (const absolutePath of files) {
      if (excludes.matches(absolutePath)) {
        diagnostics.push(
          createDiagnostic(registry, {
            level: "info",
            code: "other",
            slug: `excluded:${relPath(absolutePath)}`,
            message: `Excluded by claudeMdExcludes: ${relPath(absolutePath)}`,
            source: { path: relPath(absolutePath), scope: "repository", format: "markdown" },
          }),
        );
        continue;
      }

      const content = await readFileIfExists(absolutePath);
      if (content === undefined) {
        continue;
      }
      const frontmatter = extractFrontmatter(content);
      if (frontmatter.parseError) {
        diagnostics.push(
          createDiagnostic(registry, {
            level: "warning",
            code: "parse-error",
            slug: `rule-frontmatter:${relPath(absolutePath)}`,
            message: `Rule frontmatter could not be parsed as YAML: ${relPath(absolutePath)}`,
            source: { path: relPath(absolutePath), scope: "repository", format: "markdown" },
          }),
        );
      }

      const body = content.slice(frontmatter.bodyOffset);
      if (body.trim().length === 0) {
        continue;
      }

      const patterns = readPathsField(frontmatter.data);
      const bodySource: SourceRef = {
        path: relPath(absolutePath),
        scope: "repository",
        format: "markdown",
        ...(frontmatter.lineEnd !== undefined
          ? { lineStart: frontmatter.lineEnd + 1 }
          : { lineStart: 1 }),
      };

      if (!patterns || patterns.length === 0) {
        emit(absolutePath, body, bodySource, "startup", ["."], "matched");
        continue;
      }

      if (!targetRelPath) {
        diagnostics.push(
          createDiagnostic(registry, {
            level: "info",
            code: "assumption",
            slug: `rule-conditional:${relPath(absolutePath)}`,
            message: `Path-scoped rule ${relPath(absolutePath)} is conditional on ${patterns.join(", ")}; no targetPath was supplied, so its applicability is unknown.`,
            source: bodySource,
          }),
        );
        continue;
      }

      if (matchesClaudeRulePath(patterns, targetRelPath)) {
        emit(absolutePath, body, bodySource, "on-demand", patterns, "matched");
      }
    }
  }

  // A separately nested .claude/rules/ root (one below cwd, not covered by
  // the ancestor-chain walk above) is a documented on-demand mechanism, but
  // its exact traversal/order/glob-anchor mechanics are not yet fixture-
  // verified. Rather than silently discovering or silently ignoring it, its
  // existence is surfaced as an explicit diagnostic and its content is left
  // unread.
  if (ctx.targetPath) {
    const targetDir = await targetDirectory(ctx.targetPath);
    const descendantChain = getDescendantChain(ctx.cwd, targetDir);
    for (const dir of descendantChain) {
      const rulesRoot = path.join(dir, ".claude", "rules");
      const files = await listMarkdownFilesRecursive(rulesRoot, ctx.repositoryRoot, []);
      if (files.length > 0) {
        diagnostics.push(
          createDiagnostic(registry, {
            level: "info",
            code: "unresolved",
            slug: `nested-rules-root:${relPath(rulesRoot)}`,
            message: `A separately nested .claude/rules/ directory exists at ${relPath(rulesRoot)}. Its traversal, ordering, and glob-anchor mechanics relative to the ancestor-chain rules root are not yet fixture-verified, so it is not discovered.`,
            source: { path: relPath(rulesRoot), scope: "repository", format: "markdown" },
          }),
        );
      }
    }
  }

  function emit(
    absolutePath: string,
    content: string,
    source: SourceRef,
    loadPhase: "startup" | "on-demand",
    appliesTo: string[],
    strategy: "matched",
  ): void {
    const id = `claude:rule:${relPath(absolutePath)}`;
    instructions.push({
      id,
      content,
      source,
      scope: { appliesTo },
      loadPhase,
    });
    provenance.push({ effectiveId: id, sources: [source], resolution: { strategy } });
  }

  return { instructions, provenance, diagnostics };
}

/**
 * Reads the `paths:` globs from one Claude rule or skill file's frontmatter.
 *
 * Exposed because deciding whether two work targets are interchangeable
 * depends on which path-scoped patterns match them, and that judgement belongs
 * to the same frontmatter parsing and matcher this adapter already owns rather
 * than to a caller re-deriving Claude's conventions. Returns an empty list for
 * a file with no frontmatter, no `paths` field, or unparseable frontmatter -
 * absence of a usable pattern is not an error here, it just means the file
 * conditions nothing.
 */
export function readClaudePathPatterns(markdownSource: string): string[] {
  const frontmatter = extractFrontmatter(markdownSource);
  if (frontmatter.parseError) {
    return [];
  }
  return readPathsField(frontmatter.data) ?? [];
}
