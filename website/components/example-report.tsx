"use client";

import { useState } from "react";
import examples from "../lib/examples.json";

export function ExampleReport() {
  const [launch, setLaunch] = useState<"root" | "api">("root");
  const report = examples[launch];

  return (
    <div className="demo-shell">
      <div className="demo-toolbar">
        <span className="eyebrow">
          <span className="status-dot" /> Example analysis
        </span>
        <span className="demo-version">Fixture / Phase 6</span>
      </div>
      <div className="demo-context">
        <fieldset className="launch-controls">
          <legend className="field-label">Launch directory</legend>
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
        <div className="target-field">
          <span className="field-label">Same target</span>
          <code>{examples.target}</code>
        </div>
      </div>
      <div className="demo-body">
        <aside className="file-tree" aria-label="Fixture repository structure">
          <span className="field-label">Repository files</span>
          <div className="tree-line">▾ repository</div>
          <div className="tree-indent">
            <div className="tree-line">
              <span className="file-letter">M</span> CLAUDE.md
            </div>
            <div className="tree-line">
              <span className="file-letter">M</span> AGENTS.md
            </div>
            <div className="tree-line tree-folder">▾ apps/api</div>
            <div className="tree-indent tree-nested">
              <div className="tree-line">
                <span className="file-letter">M</span> CLAUDE.md
              </div>
              <div className={"tree-line " + (launch === "api" ? "tree-active" : "tree-muted")}>
                <span className="file-letter">M</span> AGENTS.md
              </div>
              <div className="tree-line">▸ .claude/skills</div>
              <div className={"tree-line " + (launch === "api" ? "tree-active" : "tree-muted")}>
                ▸ .agents/skills
              </div>
              <div className="tree-line">
                <span className="file-letter blue">TS</span> file.ts{" "}
                <span className="target-tag">target</span>
              </div>
            </div>
          </div>
          <div className="tree-key">
            <span className="key-line" />{" "}
            {launch === "root"
              ? "Nested Codex files outside discovery"
              : "Nested Codex files now discovered"}
          </div>
        </aside>
        <div className="report-panel">
          <div className="report-heading">
            <span className="report-title">Compatibility report</span>
            <output className="finding-count">
              {report.count} {report.count === 1 ? "finding" : "findings"}
            </output>
          </div>
          <p className="report-context">
            <code>cwd: {report.cwd}</code>
            <span>Claude Code ↔ Codex</span>
          </p>
          <div className="findings" aria-label="Example findings">
            {report.findings.map((finding) => (
              <article className="finding" key={finding.type}>
                <div className="finding-top">
                  <span className="severity">Medium</span>
                  <span className="finding-category">{finding.category}</span>
                </div>
                <h3>{finding.title}</h3>
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
                    Prefix shown; logical key and stable digest shortened. Copy a complete ID from
                    your CLI report to use explain.
                  </p>
                </details>
              </article>
            ))}
          </div>
          <div className="report-footer">
            <span className="equivalent-mark">✓</span> {report.equivalent} logical entities
            equivalent <span>Deterministic confidence</span>
          </div>
        </div>
      </div>
      <div className="demo-note" aria-live="polite">
        <span aria-hidden="true">↳</span>
        <p>{report.note}</p>
      </div>
    </div>
  );
}
