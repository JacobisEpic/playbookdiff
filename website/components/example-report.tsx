"use client";

import { useState } from "react";
import examples from "../lib/examples.json";
import { Ledger } from "./ledger";

export function ExampleReport() {
  const [launch, setLaunch] = useState<"root" | "api">("root");
  const report = examples[launch];

  return (
    <div className="example">
      <fieldset className="segmented">
        <legend>Where the agent was launched</legend>
        <div className="segmented-control">
          <button type="button" aria-pressed={launch === "root"} onClick={() => setLaunch("root")}>
            Repository root
          </button>
          <button type="button" aria-pressed={launch === "api"} onClick={() => setLaunch("api")}>
            apps/api
          </button>
        </div>
      </fieldset>

      <Ledger
        key={launch}
        animate
        command={`playbookdiff check . --cwd ${report.cwd} --path ${examples.target}`}
        meta={
          report.count === 0
            ? `no findings, ${report.equivalent} equivalent`
            : `${report.count} findings, ${report.equivalent} equivalent`
        }
        rows={report.ledger}
        findings={report.findings.map((finding) => ({
          id: finding.type,
          severity: "medium",
          title: finding.title,
          detail: finding.detail,
          evidence: finding.evidence,
        }))}
        clear="No divergence. Both agents hold the same instructions and the same skills."
      />

      <p className="example-note">{report.note}</p>
    </div>
  );
}
