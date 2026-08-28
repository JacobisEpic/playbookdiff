import { describe, expect, it } from "vitest";
import { extractFrontmatter, extractImports } from "./markdown.js";

describe("extractImports", () => {
  it("finds a simple @path reference", () => {
    const matches = extractImports("See @AGENTS.md for details.\n");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.target).toBe("AGENTS.md");
  });

  it("finds multiple references in document order", () => {
    const matches = extractImports("First @a.md then @b.md\n");
    expect(matches.map((m) => m.target)).toEqual(["a.md", "b.md"]);
    expect(matches[0]!.offsetStart).toBeLessThan(matches[1]!.offsetStart);
  });

  it("ignores a reference inside an inline code span", () => {
    const matches = extractImports("Mention `@a.md` without importing it.\n");
    expect(matches).toHaveLength(0);
  });

  it("ignores a reference inside a fenced code block", () => {
    const matches = extractImports("```text\n@a.md\n```\n");
    expect(matches).toHaveLength(0);
  });

  it("does not treat an email-like token as an import", () => {
    const matches = extractImports("Contact user@example.com for help.\n");
    expect(matches).toHaveLength(0);
  });

  it("matches a reference at the very start of emphasized text with no preceding whitespace", () => {
    const matches = extractImports("**@a.md** is bold.\n");
    expect(matches.map((m) => m.target)).toEqual(["a.md"]);
  });
});

describe("extractFrontmatter", () => {
  it("parses a leading YAML frontmatter block", () => {
    const result = extractFrontmatter(
      '---\nname: example\npaths:\n  - "src/**/*.ts"\n---\n\nBody text.\n',
    );
    expect(result.parseError).toBe(false);
    expect(result.data).toEqual({ name: "example", paths: ["src/**/*.ts"] });
    expect(result.lineStart).toBe(1);
  });

  it("returns no frontmatter when the file has none", () => {
    const result = extractFrontmatter("Just body text.\n");
    expect(result.data).toBeUndefined();
    expect(result.parseError).toBe(false);
  });

  it("reports a parse error for malformed YAML without throwing", () => {
    const result = extractFrontmatter("---\nname: [unclosed\n---\n\nBody.\n");
    expect(result.parseError).toBe(true);
  });
});
