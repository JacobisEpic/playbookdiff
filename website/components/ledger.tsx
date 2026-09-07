import type { ReactNode } from "react";
import { AgentMark } from "./site-ui";

// The ledger is the site's one signature element: two agents reading down the
// same repository, line by line, with a leader between them that either
// arrives or breaks. Both the hero and the fixture-backed example render it, so
// the page teaches a single way of looking at effective configuration.
//
// It is also the only place on the page that carries colour. A broken leader,
// "not received", and a severity label are amber; everything that matched stays
// in plain panel ink. Nothing on this page is coloured for decoration, so the
// coloured thing is always the finding.

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
        <AgentMark agent="claude" name="Claude Code" />
        <span className="ledger-head-spine" aria-hidden="true" />
        <AgentMark agent="codex" name="Codex" />
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
