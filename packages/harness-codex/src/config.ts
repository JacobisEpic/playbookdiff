import path from "node:path";
import type { Diagnostic, SourceRef } from "@playbookdiff/core/types";
import { getStaticTOMLValue, parseTOML, type AST, type ParseError } from "toml-eslint-parser";
import { createDiagnostic, type IdRegistry } from "./diagnostics.js";
import {
  getAncestorChain,
  readFileIfExists,
  toRepoRelativePosix,
  type ValidatedContext,
} from "./paths.js";

export type LocatedValue<T> = { value: T; source: SourceRef };

export type CodexConfigLayer = {
  path: string;
  source: SourceRef;
  value: Record<string, unknown>;
  ast: AST.TOMLProgram;
};

export type CodexConfig = {
  layers: CodexConfigLayer[];
  fallbackFilenames: LocatedValue<string[]>;
  maxBytes: LocatedValue<number>;
  rootMarkers?: LocatedValue<string[]>;
  diagnostics: Diagnostic[];
};

const DEFAULT_MAX_BYTES = 32 * 1024;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function keyParts(key: AST.TOMLKey): string[] {
  return key.keys.map((part) => (part.type === "TOMLBare" ? part.name : part.value));
}

function nodePath(node: AST.TOMLKeyValue): string[] {
  const own = keyParts(node.key);
  if (node.parent.type === "TOMLTable") return [...node.parent.resolvedKey.map(String), ...own];
  if (node.parent.type === "TOMLInlineTable") {
    let container = node.parent.parent;
    while (container.type === "TOMLArray") container = container.parent;
    return [...nodePath(container), ...own];
  }
  return own;
}

export function sourceForConfigPath(layer: CodexConfigLayer, wanted: readonly string[]): SourceRef {
  for (const item of layer.ast.body[0].body) {
    if (item.type === "TOMLKeyValue") {
      const found = sourceInKeyValue(layer, item, wanted);
      if (found) return found;
      continue;
    }
    if (samePath(item.resolvedKey.map(String), wanted)) return locatedSource(layer, item);
    for (const entry of item.body) {
      const found = sourceInKeyValue(layer, entry, wanted);
      if (found) return found;
    }
  }
  return layer.source;
}

function sourceInKeyValue(
  layer: CodexConfigLayer,
  node: AST.TOMLKeyValue,
  wanted: readonly string[],
): SourceRef | undefined {
  if (samePath(nodePath(node), wanted)) return locatedSource(layer, node);
  if (node.value.type === "TOMLInlineTable") {
    for (const child of node.value.body) {
      const found = sourceInKeyValue(layer, child, wanted);
      if (found) return found;
    }
  }
  if (node.value.type === "TOMLArray") {
    for (const child of node.value.elements) {
      if (child.type !== "TOMLInlineTable") continue;
      for (const entry of child.body) {
        const found = sourceInKeyValue(layer, entry, wanted);
        if (found) return found;
      }
    }
  }
  return undefined;
}

function samePath(actual: readonly string[], wanted: readonly string[]): boolean {
  return actual.length === wanted.length && actual.every((part, index) => part === wanted[index]);
}

function locatedSource(layer: CodexConfigLayer, node: AST.TOMLNode): SourceRef {
  return { ...layer.source, lineStart: node.loc.start.line, lineEnd: node.loc.end.line };
}

function valueAt(root: Record<string, unknown>, parts: readonly string[]): unknown {
  let current: unknown = root;
  for (const part of parts) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function validStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    return undefined;
  }
  return value;
}

export function configValueAt(layer: CodexConfigLayer, parts: readonly string[]): unknown {
  return valueAt(layer.value, parts);
}

export async function loadCodexConfig(
  ctx: ValidatedContext,
  registry: IdRegistry,
): Promise<CodexConfig> {
  const diagnostics: Diagnostic[] = [];
  const layers: CodexConfigLayer[] = [];
  for (const directory of getAncestorChain(ctx.repositoryRoot, ctx.cwd)) {
    const absolutePath = path.join(directory, ".codex", "config.toml");
    const raw = await readFileIfExists(absolutePath);
    if (raw === undefined) continue;
    const relativePath = toRepoRelativePosix(ctx.repositoryRoot, absolutePath);
    const source: SourceRef = { path: relativePath, scope: "repository", format: "toml" };
    try {
      const ast = parseTOML(raw, { filePath: relativePath, tomlVersion: "1.0" });
      const staticValue = getStaticTOMLValue(ast) as unknown;
      if (isRecord(staticValue))
        layers.push({ path: relativePath, source, value: staticValue, ast });
    } catch (error) {
      const parseError = error as ParseError;
      diagnostics.push(
        createDiagnostic(registry, {
          level: "warning",
          code: "parse-error",
          slug: `config:${relativePath}`,
          message: `Codex project configuration is not valid TOML: ${relativePath}`,
          source: {
            ...source,
            ...(typeof parseError.lineNumber === "number"
              ? { lineStart: parseError.lineNumber, lineEnd: parseError.lineNumber }
              : {}),
          },
          ...(error instanceof Error ? { detail: error.message } : {}),
        }),
      );
    }
  }

  const builtin: SourceRef = { path: "<codex-defaults>", scope: "unknown", format: "builtin" };
  let fallbackFilenames: LocatedValue<string[]> = { value: [], source: builtin };
  let maxBytes: LocatedValue<number> = { value: DEFAULT_MAX_BYTES, source: builtin };
  let rootMarkers: LocatedValue<string[]> | undefined;

  for (const layer of layers) {
    const fallback = configValueAt(layer, ["project_doc_fallback_filenames"]);
    if (fallback !== undefined) {
      const valid = validStringArray(fallback);
      const source = sourceForConfigPath(layer, ["project_doc_fallback_filenames"]);
      if (valid) fallbackFilenames = { value: valid, source };
      else {
        diagnostics.push(
          createDiagnostic(registry, {
            level: "warning",
            code: "parse-error",
            slug: `fallback-filenames:${layer.path}`,
            message: "project_doc_fallback_filenames must be an array of strings and was ignored.",
            source,
          }),
        );
      }
    }

    const maximum = configValueAt(layer, ["project_doc_max_bytes"]);
    if (maximum !== undefined) {
      const source = sourceForConfigPath(layer, ["project_doc_max_bytes"]);
      if (typeof maximum === "number" && Number.isSafeInteger(maximum) && maximum > 0) {
        maxBytes = { value: maximum, source };
      } else {
        diagnostics.push(
          createDiagnostic(registry, {
            level: "warning",
            code: "parse-error",
            slug: `max-bytes:${layer.path}`,
            message: "project_doc_max_bytes must be a positive integer and was ignored.",
            source,
          }),
        );
      }
    }

    const markers = configValueAt(layer, ["project_root_markers"]);
    if (markers !== undefined) {
      const valid = validStringArray(markers);
      const source = sourceForConfigPath(layer, ["project_root_markers"]);
      if (valid) rootMarkers = { value: valid, source };
      else {
        diagnostics.push(
          createDiagnostic(registry, {
            level: "warning",
            code: "parse-error",
            slug: `root-markers:${layer.path}`,
            message: "project_root_markers must be an array of strings and was ignored.",
            source,
          }),
        );
      }
    }
  }

  return {
    layers,
    fallbackFilenames,
    maxBytes,
    ...(rootMarkers ? { rootMarkers } : {}),
    diagnostics,
  };
}
