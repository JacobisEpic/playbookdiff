import type { ReactNode } from "react";

type Tone = "default" | "dark" | "warm" | "success" | "info";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo-lockup">
      <span className="logo-mark" aria-hidden="true">
        [−]
      </span>
      <span>PlaybookDiff</span>
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
