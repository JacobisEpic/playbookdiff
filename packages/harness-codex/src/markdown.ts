import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { frontmatter } from "micromark-extension-frontmatter";
import { parse as parseYaml } from "yaml";

export type FrontmatterResult = {
  data: Record<string, unknown> | undefined;
  parseError: boolean;
  lineStart: number | undefined;
  lineEnd: number | undefined;
};

export function parseMarkdown(source: string): Root {
  return fromMarkdown(source, {
    extensions: [frontmatter("yaml")],
    mdastExtensions: [frontmatterFromMarkdown("yaml")],
  });
}

export function extractFrontmatter(source: string): FrontmatterResult {
  const first = parseMarkdown(source).children[0];
  if (!first || first.type !== "yaml" || !first.position) {
    return { data: undefined, parseError: false, lineStart: undefined, lineEnd: undefined };
  }
  try {
    const parsed = parseYaml(first.value) as unknown;
    const data =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    return {
      data,
      parseError: false,
      lineStart: first.position.start.line,
      lineEnd: first.position.end.line,
    };
  } catch {
    return {
      data: undefined,
      parseError: true,
      lineStart: first.position.start.line,
      lineEnd: first.position.end.line,
    };
  }
}
