"use client";
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Narrow code surfaces must remain keyboard-scrollable. */

import { useId, useState } from "react";
import example from "../lib/effective-scope.json";
import { AgentMark } from "./site-ui";

/**
 * The interactive effective-configuration example.
 *
 * One real repository, drawn as a tree, with every configuration file labelled
 * by what each harness does with it in the selected context. The data comes
 * from `lib/effective-scope.json`, which `scripts/generate-website-example.mjs`
 * writes from actual `playbookdiff check --json` output against the checked-in
 * `cwd-target` fixture, so the page cannot drift away from the analyzer.
 *
 * Three states carry the whole mental model, and each is read straight out of
 * the compiled configuration rather than described:
 *
 *   at startup    Claude Code `loadPhase: startup`, Codex `discovery: available`
 *   on demand     Claude Code `loadPhase: on-demand`, Codex `discovery: conditional`
 *   not received  the file exists and never enters that harness's configuration
 *
 * Only "not received" is coloured, because only "not received" is a finding.
 */

type Scenario = keyof typeof example.scenarios;
type Harness = "claude" | "codex";
type Row = {
  path: string;
  directory: string;
  name: string;
  harness: Harness;
  states: Record<Scenario, string>;
};

// The generator writes the harness and state as plain strings; this is where
// they become the closed sets the component renders.
const rows = example.rows as Row[];

const states: Record<string, { short: string; long: string }> = {
  startup: { short: "at startup", long: "received when the session starts" },
  "on-demand": { short: "on demand", long: "received on the way to the work target" },
  absent: { short: "not received", long: "never received in this context" },
};

const agentNames = { claude: "Claude Code", codex: "Codex" } as const;

const launchLabel = (cwd: string) => (cwd === "." ? "the repository root" : cwd);

// Rows in repository order, grouped by the directory they sit in, so the panel
// reads like a directory listing rather than a table of paths.
const groups = rows.reduce<{ directory: string; rows: Row[] }[]>((all, row) => {
  const last = all.at(-1);
  if (last && last.directory === row.directory) last.rows.push(row);
  else all.push({ directory: row.directory, rows: [row] });
  return all;
}, []);

export function EffectiveScope() {
  const [scenario, setScenario] = useState<Scenario>("root");
  const active = example.scenarios[scenario];
  const panelId = useId();

  return (
    <div className="scope">
      <fieldset className="scope-controls">
        <legend>Both agents were launched from</legend>
        <div className="segmented-control">
          {(Object.keys(example.scenarios) as Scenario[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={scenario === key}
              aria-controls={panelId}
              onClick={() => setScenario(key)}
            >
              {launchLabel(example.scenarios[key].cwd)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="scope-panel" id={panelId}>
        <div className="scope-bar">
          <code>
            <span aria-hidden="true">$ </span>
            {`playbookdiff check . --cwd ${active.cwd} --path ${example.target}`}
          </code>
        </div>

        <div className="scope-tree">
          <p className="scope-root">
            <code>your-repo/</code>
          </p>

          {groups.map((group) => (
            <div className="scope-group" key={group.directory || "root"}>
              {group.directory ? (
                <p className="scope-directory">
                  <code>{group.directory}/</code>
                </p>
              ) : null}
              <ul>
                {group.rows.map((row) => {
                  const state = row.states[scenario];
                  return (
                    <li className="scope-row" data-state={state} key={row.path}>
                      <code className="scope-path">{row.name}</code>
                      <span className="scope-verdict">
                        <AgentMark agent={row.harness} name={agentNames[row.harness]} />
                        <span className="scope-state">
                          {states[state].short}
                          <span className="visually-hidden"> - {states[state].long}</span>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="scope-result" aria-live="polite">
          {active.findings.length === 0 ? (
            <p className="scope-clear">
              <strong>No findings.</strong> Launching inside <code>apps/api</code> puts the nested
              files in Codex&rsquo;s chain too, so both agents hold the same instructions and the
              same skills: {active.equivalent} equivalent items, nothing divergent.
            </p>
          ) : (
            <>
              <p className="scope-count">
                {active.findings.length} findings, {active.equivalent} equivalent
              </p>
              <ul>
                {active.findings.map((finding) => (
                  <li key={finding.id}>
                    <p className="scope-finding">
                      <span className="severity">{finding.severity}</span>
                      {finding.explanation}
                    </p>
                    {finding.evidence.map((path) => (
                      <code className="scope-evidence" key={path}>
                        {path}
                      </code>
                    ))}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <details className="scope-transcript">
        <summary>
          The terminal output for this run
          <span className="faq-marker" aria-hidden="true" />
        </summary>
        <pre tabIndex={0}>
          <code>{active.transcript}</code>
        </pre>
      </details>

      <p className="scope-note">
        Codex builds its instruction chain and skill discovery from the launch directory. Claude
        Code also reaches configuration nested under the work target, on demand. Both runs here work
        on <code>{example.target}</code>; only <code>--cwd</code> changes.
      </p>
    </div>
  );
}
