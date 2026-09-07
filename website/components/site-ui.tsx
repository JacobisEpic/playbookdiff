/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Narrow code surfaces must remain keyboard-scrollable. */
import type { ReactNode } from "react";
import { npmUrl, repositoryUrl, site } from "../lib/site";

export function Logo() {
  return (
    <span className="logo">
      {/* The mark is decorative; the word mark next to it carries the name. */}
      <img className="logo-mark" src="/brand/mascots-reading.png" alt="" width="364" height="297" />
      <img
        className="logo-word"
        src="/brand/wordmark.png"
        alt="PlaybookDiff"
        width="661"
        height="138"
      />
    </span>
  );
}

// The two agents are told apart by their own icons and their names, never by
// recolouring the surrounding type. See the colour note in app/globals.css.
export function AgentMark({ agent, name }: { agent: "claude" | "codex"; name: string }) {
  return (
    <span className="agent">
      <img
        src={agent === "claude" ? "/brand/claude_logo.png" : "/brand/codex_logo.png"}
        alt=""
        width="1254"
        height="1254"
      />
      {name}
    </span>
  );
}

export function ButtonLink({
  children,
  href,
  variant = "primary",
  external = false,
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "ghost";
  external?: boolean;
}) {
  return (
    <a className={`button button-${variant}`} href={href}>
      {children}
      {external ? <span aria-hidden="true">↗</span> : null}
    </a>
  );
}

// A shell block. Each line gets its own prompt, and the prompt is decorative so
// a copied selection is the command rather than the transcript.
export function Command({ children, label }: { children: string; label?: string }) {
  return (
    <pre className="command" tabIndex={0} aria-label={label}>
      <code>
        {children.split("\n").map((line, index) => (
          <span className="command-line" key={line}>
            {index > 0 ? "\n" : null}
            <span aria-hidden="true">$ </span>
            {line}
          </span>
        ))}
      </code>
    </pre>
  );
}

export function SiteHeader({ home = false }: { home?: boolean }) {
  return (
    <header className="site-header" id="top">
      <div className="container header-inner">
        <a className="brand-link" href={home ? "#top" : "/"} aria-label="PlaybookDiff home">
          <Logo />
        </a>
        <nav aria-label="Main navigation">
          <a href="/docs">Docs</a>
          <a href={site.repository}>
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <a className="brand-link" href="/" aria-label="PlaybookDiff home">
          <Logo />
        </a>
        <nav aria-label="Footer navigation">
          <a href="/docs/cli">CLI</a>
          <a href="/docs/action">Action</a>
          <a href="/docs/security">Security</a>
          <a href="/docs/limitations">Limitations</a>
          <a href={repositoryUrl("CONTRIBUTING.md")}>Contribute</a>
        </nav>
        <p className="footer-meta">
          <a href={`${site.repository}/releases/tag/${site.release}`}>{site.release}</a>
          <a href={npmUrl}>npm</a>
          <a href={repositoryUrl("LICENSE")}>MIT</a>
        </p>
      </div>
    </footer>
  );
}
