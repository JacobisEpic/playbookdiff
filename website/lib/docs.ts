import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderMarkdown, type RenderedMarkdown } from "./markdown";
import { repositoryUrl } from "./site";

/**
 * First-party documentation, rendered from the repository's own Markdown.
 *
 * `docs/` in the repository stays the single source of truth. `pnpm
 * website:sync` mirrors it into `content/docs/`, `tests/docs.test.mjs` fails
 * if the mirror drifts, and the routes under `/docs` render it. There is no
 * second copy anyone edits by hand.
 */

export type DocPage = {
  /** Route under `/docs`. */
  slug: string;
  /** Path of the Markdown source in the repository. */
  source: string;
  title: string;
  summary: string;
};

export type DocSection = { title: string; pages: DocPage[] };

export const sections: DocSection[] = [
  {
    title: "Using it",
    pages: [
      {
        slug: "cli",
        source: "docs/cli.md",
        title: "CLI",
        summary: "Install, the three commands, --cwd vs --path, exit codes, and the JSON contract.",
      },
      {
        slug: "action",
        source: "docs/github-action.md",
        title: "GitHub Action",
        summary:
          "Workflow setup, what one run covers, inputs and outputs, and pass/fail behaviour.",
      },
      {
        slug: "git-diff",
        source: "docs/git-diff.md",
        title: "Git regression analysis",
        summary: "How two revisions are compared, and why pre-existing divergence never fails CI.",
      },
    ],
  },
  {
    title: "What it claims",
    pages: [
      {
        slug: "limitations",
        source: "docs/limitations.md",
        title: "Scope and limitations",
        summary: "The supported-semantics matrix, and everything deliberately left unknown.",
      },
      {
        slug: "security",
        source: "docs/security.md",
        title: "Security model",
        summary: "Read-only analysis, no execution, no network, and how secrets are handled.",
      },
      {
        slug: "comparison",
        source: "docs/comparison.md",
        title: "Comparison specification",
        summary: "The deterministic rules behind equivalent, divergent, and unknown.",
      },
    ],
  },
  {
    title: "How it works",
    pages: [
      {
        slug: "architecture",
        source: "docs/architecture.md",
        title: "Architecture",
        summary: "Packages, boundaries, and where harness-specific behaviour is allowed to live.",
      },
      {
        slug: "validation",
        source: "docs/validation.md",
        title: "Validation strategy",
        summary: "How harness behaviour is established and kept honest by fixtures and tests.",
      },
      {
        slug: "harnesses/claude",
        source: "docs/harnesses/claude.md",
        title: "Claude Code harness",
        summary: "Discovery rules modelled for Claude Code, with its official documentation cited.",
      },
      {
        slug: "harnesses/codex",
        source: "docs/harnesses/codex.md",
        title: "Codex harness",
        summary: "Discovery rules modelled for Codex, with its official documentation cited.",
      },
    ],
  },
];

export const pages: DocPage[] = sections.flatMap((section) => section.pages);

const bySource = new Map(pages.map((page) => [page.source, page]));

export const findPage = (slug: string) => pages.find((page) => page.slug === slug);

/**
 * Rewrites a link written for the repository so it works on the website.
 *
 * A document that has a first-party route becomes an internal link, anchors
 * included. Anything else - a repository policy file, the release guide, a
 * source path - keeps pointing at GitHub, which is where it belongs.
 */
export function resolveDocLink(source: string, href: string) {
  if (/^(https?:|mailto:|#)/.test(href)) return href;

  const [target, hash] = href.split("#");
  const repositoryPath = path.posix.normalize(path.posix.join(path.posix.dirname(source), target));
  const page = bySource.get(repositoryPath);
  const anchor = hash ? `#${hash}` : "";

  return page ? `/docs/${page.slug}${anchor}` : `${repositoryUrl(repositoryPath)}${anchor}`;
}

const contentRoot = path.join(process.cwd(), "content");

export async function renderDoc(page: DocPage): Promise<RenderedMarkdown> {
  const markdown = await readFile(path.join(contentRoot, page.source), "utf8");
  return renderMarkdown(markdown, { resolveLink: (href) => resolveDocLink(page.source, href) });
}
