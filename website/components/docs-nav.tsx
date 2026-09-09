import { pages, sections } from "../lib/docs";
import { repositoryUrl, site } from "../lib/site";
import { ExternalLink } from "./site-ui";

/**
 * The documentation index, rendered beside every docs page.
 *
 * It is a plain list of links: short enough that it needs no search, no
 * collapsing, and no client-side state. On narrow screens it becomes a
 * disclosure so it never pushes the page content off the first screen.
 */
export function DocsNav({ current }: { current?: string }) {
  const list = (
    <>
      <a className="docs-nav-home" href="/docs" aria-current={current ? undefined : "page"}>
        Overview
      </a>
      {sections.map((section) => (
        <div key={section.title}>
          <p className="docs-nav-title">{section.title}</p>
          <ul>
            {section.pages.map((page) => (
              <li key={page.slug}>
                <a
                  href={`/docs/${page.slug}`}
                  aria-current={page.slug === current ? "page" : undefined}
                >
                  {page.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div>
        <p className="docs-nav-title">Repository</p>
        <ul>
          <li>
            <ExternalLink href={site.repository}>
              Source <span aria-hidden="true">↗</span>
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href={repositoryUrl("CONTRIBUTING.md")}>
              Contributing <span aria-hidden="true">↗</span>
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href={repositoryUrl("docs/releasing.md")}>
              Release process <span aria-hidden="true">↗</span>
            </ExternalLink>
          </li>
        </ul>
      </div>
    </>
  );

  const label = current
    ? (pages.find((page) => page.slug === current)?.title ?? "Docs")
    : "Overview";

  return (
    <nav className="docs-nav" aria-label="Documentation">
      <details className="docs-nav-mobile">
        <summary>
          Documentation<span className="docs-nav-current">{label}</span>
          <span className="faq-marker" aria-hidden="true" />
        </summary>
        <div className="docs-nav-list">{list}</div>
      </details>
      <div className="docs-nav-list docs-nav-wide">{list}</div>
    </nav>
  );
}
