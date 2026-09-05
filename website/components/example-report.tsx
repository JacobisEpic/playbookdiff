"use client";

import { useState } from "react";
import examples from "../lib/examples.json";
import { type Receipt, receiptSummary } from "../lib/site";
import { Badge, ProductFrame, RepoTree } from "./site-ui";

function Receipts({ claude, codex }: { claude: Receipt; codex: Receipt }) {
  return (
    <div className="receipt-row" aria-label="What each agent ends up with">
      <article>
        <span className="agent-mark agent-mark-claude" aria-hidden="true">
          <img src="/brand/claude_logo.png" alt="" width="1254" height="1254" />
        </span>
        <div>
          <h3>Claude Code</h3>
          <p>{receiptSummary(claude)}</p>
        </div>
      </article>
      <article>
        <span className="agent-mark agent-mark-codex" aria-hidden="true">
          <img src="/brand/codex_logo.png" alt="" width="1254" height="1254" />
        </span>
        <div>
          <h3>Codex</h3>
          <p>{receiptSummary(codex)}</p>
        </div>
      </article>
    </div>
  );
}

export function ExampleReport() {
  const [launch, setLaunch] = useState<"root" | "api">("root");
  const report = examples[launch];

  return (
    <ProductFrame
      className="demo-shell"
      label={
        <span className="frame-label">
          <span className="status-dot" /> playbookdiff check {report.cwd} --path {examples.target}
        </span>
      }
      meta={`baseline ${examples.baseline.slice(0, 7)}`}
    >
      <div className="demo-context">
        <fieldset className="launch-controls">
          <legend>Where the agent was started</legend>
          <div className="segmented">
            <button
              type="button"
              aria-pressed={launch === "root"}
              onClick={() => setLaunch("root")}
            >
              <span aria-hidden="true">⌂</span> Repository root
            </button>
            <button type="button" aria-pressed={launch === "api"} onClick={() => setLaunch("api")}>
              <span aria-hidden="true">↳</span> apps/api
            </button>
          </div>
        </fieldset>
        <p className="demo-hint">
          Same repository, same file to work on. Only the launch directory changes.
        </p>
      </div>

      <RepoTree
        key={launch}
        root={examples.tree.root}
        nodes={examples.tree.nodes}
        unreached={report.unreached}
      />

      <Receipts claude={report.claude} codex={report.codex} />

      <div className="report-panel" key={`report-${launch}`}>
        <div className="report-heading">
          <div>
            <span className="report-label">Compatibility report</span>
            <h3>
              {report.count === 0
                ? "Both agents got the same playbook"
                : "One agent is missing part of the playbook"}
            </h3>
          </div>
          <output className={`finding-count ${report.count === 0 ? "finding-count-clear" : ""}`}>
            {report.count === 0 ? "Clear" : `${report.count} findings`}
          </output>
        </div>

        {report.findings.length === 0 ? (
          <div className="findings-empty">
            <span className="empty-check" aria-hidden="true">
              ✓
            </span>
            <div>
              <strong>Nothing to report.</strong>
              <p>All four instructions and skills match on both sides.</p>
            </div>
          </div>
        ) : (
          <div className="findings" aria-label="Findings">
            {report.findings.map((finding) => (
              <article className="finding" key={finding.type}>
                <div className="finding-top">
                  <Badge tone="warm">Medium</Badge>
                  <span className="finding-category">{finding.category}</span>
                </div>
                <h4>{finding.title}</h4>
                <p>{finding.detail}</p>
                <div className="evidence">
                  <span>Evidence</span>
                  {finding.evidence.map((file) => (
                    <code key={file}>{file}</code>
                  ))}
                </div>
                <details className="finding-id">
                  <summary>Why this survives a refactor</summary>
                  <code>{finding.idPrefix}…</code>
                  <p>
                    Findings are keyed by what they mean, not by line number, so moving the file
                    does not turn one finding into two. This fixture shows a shortened prefix; the
                    CLI prints the complete ID.
                  </p>
                </details>
              </article>
            ))}
          </div>
        )}

        <div className="report-footer">
          <span className="equivalent-mark" aria-hidden="true">
            ✓
          </span>
          <span>{report.equivalent} compared and identical</span>
          <span>No model call, no network</span>
        </div>
      </div>

      <div className="demo-note" aria-live="polite">
        <span aria-hidden="true">↳</span>
        <p>{report.note}</p>
      </div>
    </ProductFrame>
  );
}
