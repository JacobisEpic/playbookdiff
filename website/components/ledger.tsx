import type { ReactNode } from "react";

// The ledger is the site's one signature element: two agents reading down the
// same repository, column by column, with a connector that either joins or
// does not. Both the hero and the fixture-backed demo render it so the page
// teaches a single way of looking at effective configuration.

export type LedgerRow = {
  id: string;
  group: string;
  left: string;
  right: string | null;
};

export type LedgerFinding = {
  id: string;
  severity: string;
  title: string;
  detail?: string;
  evidence?: string[];
};

function AgentHead({ agent, name }: { agent: "claude" | "codex"; name: string }) {
  return (
    <span className={`agent agent-${agent}`}>
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

export function Ledger({
  command,
  meta,
  rows,
  findings,
  clear,
  animate = false,
  id,
}: {
  command: string;
  meta?: ReactNode;
  rows: LedgerRow[];
  findings: LedgerFinding[];
  clear?: ReactNode;
  animate?: boolean;
  id?: string;
}) {
  let step = 0;

  return (
    <div className="ledger" id={id} data-animate={animate ? "" : undefined}>
      <div className="ledger-bar">
        <code>
          <span aria-hidden="true">$</span> {command}
        </code>
        {meta ? <span className="ledger-meta">{meta}</span> : null}
      </div>

      <div className="ledger-head">
        <AgentHead agent="claude" name="Claude Code" />
        <span className="ledger-head-spine" aria-hidden="true" />
        <AgentHead agent="codex" name="Codex" />
      </div>

      <div className="ledger-body">
        {rows.map((row, index) => {
          const first = index === 0 || rows[index - 1].group !== row.group;
          const delay = step++;
          return (
            <div className="ledger-entry" key={row.id}>
              {first ? (
                <p className="ledger-group" style={{ "--i": delay } as React.CSSProperties}>
                  <span>{row.group}</span>
                </p>
              ) : null}
              <div
                className={`ledger-row ${row.right === null ? "is-broken" : "is-matched"}`}
                style={{ "--i": delay } as React.CSSProperties}
              >
                <code className="ledger-cell ledger-cell-left">{row.left}</code>
                <span className="ledger-link" aria-hidden="true" />
                {row.right === null ? (
                  <span className="ledger-cell ledger-cell-absent">not received</span>
                ) : (
                  <code className="ledger-cell ledger-cell-right">{row.right}</code>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ledger-foot" style={{ "--i": step } as React.CSSProperties}>
        {findings.length === 0 ? (
          <p className="ledger-clear">{clear}</p>
        ) : (
          <ul>
            {findings.map((finding) => (
              <li key={finding.id}>
                <p className="ledger-finding">
                  <span className="severity">{finding.severity}</span>
                  {finding.title}
                </p>
                {finding.detail ? <p className="ledger-detail">{finding.detail}</p> : null}
                {finding.evidence?.map((file) => (
                  <code className="ledger-evidence" key={file}>
                    {file}
                  </code>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
