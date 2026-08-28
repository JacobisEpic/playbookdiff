import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { frontmatter } from "micromark-extension-frontmatter";
import { parse as parseYaml } from "yaml";
import { visit } from "unist-util-visit";
import type { Root, Text } from "mdast";

/** Parses Markdown to an mdast tree with YAML-frontmatter awareness and source positions. */
export function parseMarkdown(source: string): Root {
  return fromMarkdown(source, {
    extensions: [frontmatter("yaml")],
    mdastExtensions: [frontmatterFromMarkdown("yaml")],
  });
}

export type ImportMatch = {
  target: string;
  offsetStart: number;
  offsetEnd: number;
};

// Matches "@path" preceded by start-of-node or whitespace, so `user@example.com`
// (preceded by a word character) never matches. The path itself is a maximal
// run of non-whitespace; trailing sentence punctuation is deliberately not
// stripped since Claude Code's exact import-token grammar isn't documented -
// an untrimmed path that fails to resolve produces an honest "unresolved"
// diagnostic instead of a guessed truncation rule.
const IMPORT_PATTERN = /(^|\s)@(\S+)/g;

/**
 * Finds `@path` import references in prose only - only `text` mdast nodes are
 * visited, so references inside inline code spans or fenced code blocks are
 * structurally excluded rather than filtered out with a raw-text regex.
 */
export function extractImports(source: string): ImportMatch[] {
  const tree = parseMarkdown(source);
  const matches: ImportMatch[] = [];
  visit(tree, "text", (node: Text) => {
    const start = node.position?.start;
    if (!start || start.offset === undefined) {
      return;
    }
    const value = node.value;
    IMPORT_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IMPORT_PATTERN.exec(value)) !== null) {
      const leading = match[1] ?? "";
      const target = match[2];
      if (!target) {
        continue;
      }
      const matchStartInNode = match.index + leading.length;
      const matchEndInNode = match.index + match[0].length;
      matches.push({
        target,
        offsetStart: start.offset + matchStartInNode,
        offsetEnd: start.offset + matchEndInNode,
      });
    }
  });
  matches.sort((a, b) => a.offsetStart - b.offsetStart);
  return matches;
}

export type FrontmatterResult = {
  data: Record<string, unknown> | undefined;
  parseError: boolean;
  raw: string | undefined;
  lineStart: number | undefined;
  lineEnd: number | undefined;
  bodyOffset: number;
};

/** Extracts and parses a leading YAML frontmatter block, if present. */
export function extractFrontmatter(source: string): FrontmatterResult {
  const tree = parseMarkdown(source);
  const first = tree.children[0];
  if (
    !first ||
    first.type !== "yaml" ||
    !first.position ||
    first.position.end.offset === undefined
  ) {
    return {
      data: undefined,
      parseError: false,
      raw: undefined,
      lineStart: undefined,
      lineEnd: undefined,
      bodyOffset: 0,
    };
  }
  const raw = first.value;
  const lineStart = first.position.start.line;
  const lineEnd = first.position.end.line;
  const bodyOffset = first.position.end.offset;
  try {
    const parsed = parseYaml(raw) as unknown;
    const data = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    return { data, parseError: false, raw, lineStart, lineEnd, bodyOffset };
  } catch {
    return { data: undefined, parseError: true, raw, lineStart, lineEnd, bodyOffset };
  }
}
