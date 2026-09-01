"use client";

import { useState } from "react";
import examples from "../lib/examples.json";
import { type Receipt, receiptSummary } from "../lib/site";
import { Badge, ProductFrame } from "./site-ui";

function AgentReceipt({
  agent,
  mark,
  receipt,
  tone,
}: {
  agent: string;
  mark: string;
  receipt: Receipt;
  tone: "claude" | "codex";
}) {
  return (
    <article className={`agent-receipt agent-receipt-${tone}`}>
      <header>
        <span className="agent-mark" aria-hidden="true">
          {mark}
        </span>
        <div>
          <h3>{agent}</h3>
          <p>{receiptSummary(receipt)}</p>
        </div>
      </header>
      <div className="receipt-group">
        <span>Instructions received</span>
        <ul>
          {receipt.instructions.map((item) => (
            <li key={item}>
              <span className="receipt-check" aria-hidden="true">
                ✓
              </span>
              <code>{item}</code>
            </li>
          ))}
        </ul>
      </div>
      <div className="receipt-group">
        <span>Skills discovered</span>
        <ul>
          {receipt.skills.map((item) => (
            <li key={item}>
              <span className="receipt-check" aria-hidden="true">
                ✓
              </span>
              <code>{item}</code>
            </li>
          ))}
        </ul>
      </div>
      {receipt.notReceived.length > 0 ? (
        <div className="receipt-missing">
          <span>Outside this launch scope</span>
          {receipt.notReceived.map((item) => (
            <code key={item}>− {item}</code>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function ExampleReport() {
  const [launch, setLaunch] = useState<"root" | "api">("root");
  const report = examples[launch];
  const launchLabel = launch === "root" ? "Repository root" : "apps/api";

  return (
    <ProductFrame
      className="demo-shell"
      label={
        <span className="frame-label">
          <span className="status-dot" /> Fixture-backed analysis
        </span>
      }
      meta={`baseline ${examples.baseline.slice(0, 7)}`}
    >
      <div className="demo-context">
        <fieldset className="launch-controls">
          <legend>Launch directory</legend>
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
        <div className="context-paths">
          <div>
            <span>cwd</span>
            <code>{report.cwd}</code>
          </div>
          <span className="context-divider" aria-hidden="true">
            →
          </span>
          <div>
            <span>Same work target</span>
            <code>{examples.target}</code>
          </div>
        </div>
      </div>

      <div className="demo-receipts" aria-label="Configuration received by each coding agent">
        <AgentReceipt agent="Claude Code" mark="C" receipt={report.claude} tone="claude" />
        <div className="receipt-compare" aria-hidden="true">
          <span>compare</span>
          <strong>↔</strong>
        </div>
        <AgentReceipt agent="Codex" mark="X" receipt={report.codex} tone="codex" />
      </div>

      <div className="report-panel">
        <div className="report-heading">
          <div>
            <span className="report-label">Compatibility report</span>
            <h3>
              {report.count === 0 ? "No differences for this context" : "Scope changes the result"}
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
              <strong>Both harnesses receive the same fixture configuration.</strong>
              <p>Two instructions and two skills compare equivalent. Nothing is reported.</p>
            </div>
          </div>
        ) : (
          <div className="findings" aria-label="Example findings">
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
                  <summary>Finding ID structure</summary>
                  <code>{finding.idPrefix}…</code>
                  <p>
                    The logical key stays stable across line movement. This fixture shows a
                    shortened prefix; the CLI prints the complete ID.
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
          <span>{report.equivalent} logical entities equivalent</span>
          <span>Deterministic confidence</span>
        </div>
      </div>

      <div className="demo-note" aria-live="polite">
        <span aria-hidden="true">↳</span>
        <p>
          <strong>{launchLabel} selected.</strong> {report.count}{" "}
          {report.count === 1 ? "finding" : "findings"}. {report.note}
        </p>
      </div>
    </ProductFrame>
  );
}
