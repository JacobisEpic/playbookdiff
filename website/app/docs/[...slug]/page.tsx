import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsNav } from "../../../components/docs-nav";
import { findPage, pages, renderDoc } from "../../../lib/docs";
import { openGraph, repositoryUrl } from "../../../lib/site";

type Props = { params: Promise<{ slug: string[] }> };

export function generateStaticParams() {
  return pages.map((page) => ({ slug: page.slug.split("/") }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findPage((await params).slug.join("/"));
  if (!page) return {};
  return {
    title: page.title,
    description: page.summary,
    alternates: { canonical: `/docs/${page.slug}` },
    openGraph: openGraph(`/docs/${page.slug}`, `${page.title} - PlaybookDiff`),
  };
}

export default async function DocPage({ params }: Props) {
  const page = findPage((await params).slug.join("/"));
  if (!page) notFound();

  const { title, html, headings } = await renderDoc(page);

  return (
    <>
      <DocsNav current={page.slug} />
      <article className="doc">
        <header className="doc-head">
          <h1>{title || page.title}</h1>
          <p className="doc-lead">{page.summary}</p>
          {/* GitHub stays the canonical home of the code, and of this file. */}
          <a className="doc-source-link" href={repositoryUrl(page.source)}>
            View source on GitHub <span aria-hidden="true">↗</span>
          </a>
        </header>

        {headings.length > 2 ? (
          <nav className="doc-contents" aria-label="On this page">
            <p>On this page</p>
            <ul>
              {headings.map((heading) => (
                <li key={heading.id}>
                  <a href={`#${heading.id}`}>{heading.text}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {/* Repository-owned Markdown, rendered at build time by lib/markdown.ts. */}
        <div className="doc-body" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </>
  );
}
