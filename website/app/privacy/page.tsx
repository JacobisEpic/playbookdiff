import type { Metadata } from "next";
import { ExternalLink, SiteFooter, SiteHeader } from "../../components/site-ui";
import { openGraph, site } from "../../lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What happens to an email address given to the PlaybookDiff update list, and who handles it.",
  alternates: { canonical: "/privacy" },
  openGraph: openGraph("/privacy", "PlaybookDiff privacy"),
};

export default function Privacy() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />

      <main className="container page-shell" id="main">
        <article className="doc">
          <header className="doc-head">
            <h1>Privacy</h1>
            <p className="doc-lead">
              The {site.name} website collects one thing, and only if you hand it over: the email
              address you enter into the update signup.
            </p>
          </header>

          <div className="doc-body">
            <h2 id="the-update-list">
              <a className="doc-anchor" href="#the-update-list">
                The update list
              </a>
            </h2>
            <p>
              An address entered into the signup form is used to send {site.name} project and
              product updates: new releases, support for more coding agents, and changes worth
              knowing about. It is not used for anything else, and it is not sold or shared for
              advertising.
            </p>
            <p>
              Email delivery and subscriber management are handled by{" "}
              <ExternalLink href="https://buttondown.com/">Buttondown</ExternalLink>, which stores
              the list. The form posts directly to Buttondown; this site keeps no subscriber
              database of its own. Buttondown&rsquo;s handling of the data it stores is described in{" "}
              <ExternalLink href="https://buttondown.com/legal/privacy">
                its privacy policy
              </ExternalLink>
              .
            </p>
            <p>
              Every email carries an unsubscribe link, and unsubscribing removes the address from
              the list.
            </p>

            <h2 id="the-rest-of-the-site">
              <a className="doc-anchor" href="#the-rest-of-the-site">
                The rest of the site
              </a>
            </h2>
            <p>
              The rest of {site.name}.dev is static pages with no analytics, no advertising, no
              tracking cookies, and self-hosted typefaces, so browsing it sends nothing to a third
              party. The {site.name} CLI and GitHub Action are separate from this site and make no
              network calls at all; the <a href="/docs/security">security model</a> covers them.
            </p>
            <p>
              Questions, or want an address removed by hand?{" "}
              <ExternalLink href={`${site.repository}/issues`}>Open an issue</ExternalLink> on the
              repository.
            </p>
          </div>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
