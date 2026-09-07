import { SiteFooter, SiteHeader } from "../../components/site-ui";

export default function DocsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main className="container docs-shell" id="main">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
