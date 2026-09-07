/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Narrow code surfaces must remain keyboard-scrollable. */
import type { ReactNode } from "react";

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

export function Command({ children, label }: { children: string; label?: string }) {
  return (
    <pre className="command" tabIndex={0} aria-label={label}>
      <code>
        <span aria-hidden="true">$</span> {children}
      </code>
    </pre>
  );
}
