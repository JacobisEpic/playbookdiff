import type { Metadata } from "next";
import { DocsNav } from "../../components/docs-nav";
import { Command, ExternalLink } from "../../components/site-ui";
import { sections } from "../../lib/docs";
import { openGraph, repositoryUrl, site } from "../../lib/site";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "How to run PlaybookDiff locally and in CI, what it compares, what it refuses to claim, and how each guarantee is enforced.",
  alternates: { canonical: "/docs" },
  openGraph: openGraph("/docs", "PlaybookDiff documentation"),
};

export default function DocsIndex() {
  return (
    <>
      <DocsNav />
      <article className="doc">
        <header className="doc-head">
          <h1>Documentation</h1>
          <p className="doc-lead">
            PlaybookDiff compiles the instructions, skills, and MCP servers Claude Code and Codex
            each effectively receive from a repository, then reports the differences it can prove
            from that repository&rsquo;s own files.
          </p>
        </header>

        <div className="doc-body">
          <h2 id="install">
            <a className="doc-anchor" href="#install">
              Install
            </a>
          </h2>
          <p>
            The CLI is published to npm as <code>{site.npmPackage}</code> and needs Node.js 24.11 or
            newer within the 24.x line.
          </p>
          <Command label="Install PlaybookDiff and check a repository">
            {`npm install -g ${site.npmPackage}\nplaybookdiff check .`}
          </Command>
          <p>
            To try it without installing anything, run <code>npx {site.npmPackage} check .</code>.
            To run it from a checkout instead, see <a href="/docs/cli">the CLI reference</a>.
          </p>

          <h2 id="contents">
            <a className="doc-anchor" href="#contents">
              Contents
            </a>
          </h2>
          {sections.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              <ul className="doc-index">
                {section.pages.map((page) => (
                  <li key={page.slug}>
                    <a href={`/docs/${page.slug}`}>{page.title}</a>
                    <span>{page.summary}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="doc-source">
            Every page here renders the Markdown in the repository&rsquo;s{" "}
            <ExternalLink href={repositoryUrl("docs", "tree")}>
              docs directory <span aria-hidden="true">↗</span>
            </ExternalLink>
            , which stays the source of truth.
          </p>
        </div>
      </article>
    </>
  );
}
