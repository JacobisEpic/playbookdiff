import type { ReactNode } from "react";

type Tone = "default" | "dark" | "warm" | "success" | "info";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo-lockup">
      {/* The mark is decorative; the word mark next to it carries the name. */}
      <img className="logo-mark" src="/brand/mascots-reading.png" alt="" width="364" height="297" />
      <img
        className="logo-word"
        src="/brand/wordmark-on-dark.png"
        alt="PlaybookDiff"
        width="661"
        height="138"
      />
      {compact ? null : <span className="logo-label">OSS</span>}
    </span>
  );
}

export function Kicker({ children, tone = "default" }: { children: ReactNode; tone?: Tone }) {
  return <p className={`kicker kicker-${tone}`}>{children}</p>;
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function ButtonLink({
  children,
  href,
  variant = "primary",
  external = false,
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  external?: boolean;
}) {
  return (
    <a className={`button button-${variant}`} href={href}>
      <span>{children}</span>
      <span aria-hidden="true">{external ? "↗" : "→"}</span>
    </a>
  );
}

export function SectionHeader({
  id,
  kicker,
  title,
  description,
  align = "split",
}: {
  id: string;
  kicker: ReactNode;
  title: ReactNode;
  description: ReactNode;
  align?: "split" | "center";
}) {
  return (
    <div className={`section-header section-header-${align}`}>
      <div>
        <Kicker>{kicker}</Kicker>
        <h2 id={id}>{title}</h2>
      </div>
      <p>{description}</p>
    </div>
  );
}

export function ProductFrame({
  children,
  label,
  meta,
  className = "",
}: {
  children: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`product-frame ${className}`.trim()}>
      <div className="product-frame-bar">
        <span>{label}</span>
        <span>{meta}</span>
      </div>
      {children}
    </div>
  );
}

export type TreeNode = {
  id: string;
  indent: number;
  name: string;
  kind: string;
  harness?: string;
};

const HARNESS_LABEL: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
};

export function RepoTree({
  root,
  nodes,
  unreached,
  caption,
}: {
  root: string;
  nodes: TreeNode[];
  unreached: string[];
  caption?: ReactNode;
}) {
  const missing = new Set(unreached);

  return (
    <div className="repo-tree">
      <div className="repo-tree-head">
        <span className="repo-tree-root">{root}/</span>
        <span className="repo-tree-legend">
          <span>
            <i className="reach-mark reach-yes" aria-hidden="true" /> reached
          </span>
          <span>
            <i className="reach-mark reach-no" aria-hidden="true" /> never reached
          </span>
        </span>
      </div>
      <ul>
        {nodes.map((node) => {
          const unread = missing.has(node.id);
          const owner = node.harness ? HARNESS_LABEL[node.harness] : undefined;
          return (
            <li
              key={node.id}
              className={`tree-row tree-${node.kind === "dir" || node.kind === "target" ? node.kind : "file"}${
                unread ? " tree-unreached" : ""
              }`}
              style={{ "--indent": node.indent } as React.CSSProperties}
            >
              <span className="tree-name">
                <span className="tree-branch" aria-hidden="true" />
                <code>{node.name}</code>
              </span>
              {owner ? (
                <span className="tree-owner">
                  <i
                    className={`reach-mark ${unread ? "reach-no" : "reach-yes"}`}
                    aria-hidden="true"
                  />
                  <span className="tree-owner-name">{owner}</span>
                  <span className="tree-kind">{node.kind}</span>
                </span>
              ) : (
                <span className="tree-owner tree-owner-none">
                  {node.kind === "target" ? "the file you asked about" : null}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {caption ? <p className="repo-tree-caption">{caption}</p> : null}
    </div>
  );
}
