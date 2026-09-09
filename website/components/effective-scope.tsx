"use client";
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Terminal output must remain keyboard-scrollable. */

import { useId, useState } from "react";
import example from "../lib/effective-scope.json";
import { AgentMark } from "./site-ui";

type Scenario = keyof typeof example.scenarios;
type Harness = "claude" | "codex";
const agents: Harness[] = ["claude", "codex"];
const names = { claude: "Claude Code", codex: "Codex" };
const labels: Record<string, string> = {
  startup: "At startup",
  "on-demand": "On demand",
  absent: "Not received",
};

// The fixture supplies hierarchy, ownership, states, and target. This component
// only places that data on a map; it never resolves harness behavior itself.
const directories = [...new Set(example.rows.map((row) => row.directory))];
const levels = directories.map((directory, index) => ({ directory, y: 24 + index * 190 }));
const nodes = levels.flatMap(({ directory, y }) =>
  agents.flatMap((agent) =>
    example.rows
      .filter((row) => row.directory === directory && row.harness === agent)
      .map((row, index) => ({ ...row, x: agent === "claude" ? 150 : 450, y: y + 74 + index * 48 })),
  ),
);
const mapHeight = levels.length * 190 + 100;
const targetY = mapHeight - 30;

export function EffectiveScope() {
  const [scenario, setScenario] = useState<Scenario>("root");
  const [selected, setSelected] = useState<Harness>("codex");
  const [inspection, setInspection] = useState<string | null>(null);
  const panelId = useId();
  const contextId = useId();
  const active = example.scenarios[scenario];
  const launchDirectory = active.cwd === "." ? "" : active.cwd;
  const startY = levels.find((level) => level.directory === launchDirectory)!.y;
  const selectedRows = nodes.filter((row) => row.harness === selected);
  // Start with the interesting nested instruction, not an extra introductory step.
  const node =
    nodes.find((row) => row.path === inspection) ??
    (inspection === null ? selectedRows.find((row) => row.directory !== "") : undefined);
  const inspectedId = node?.path ?? inspection;
  const inspectedDirectory = levels.find((level) => `@${level.directory}` === inspection);
  const state = node?.states[scenario];
  let contextTitle = "Same target";
  let contextPath = example.target;
  let explanation =
    "Both sessions work on this file. A missing instruction does not mean the agent cannot access the source code.";
  let contextFinding = false;

  if (node && state) {
    contextTitle = labels[state];
    contextPath = node.path;
    contextFinding = state === "absent";
    explanation =
      state === "absent"
        ? `This ${node.kind} exists, but ${names[selected]} does not receive it here. Launch from ${node.directory} to include it.`
        : state === "on-demand"
          ? `${names[selected]} reaches this ${node.kind} when working inside ${node.directory}. It joins the effective configuration on demand.`
          : `${names[selected]} receives this ${node.kind} when the session starts${node.directory ? ` in ${active.cwd}` : ""}. It is already part of the effective configuration.`;
  } else if (inspectedDirectory) {
    contextTitle = inspectedDirectory.directory ? "Nested directory" : "Repository root";
    contextPath = inspectedDirectory.directory || "your-repo/";
    const items = selectedRows.filter((row) => row.directory === inspectedDirectory.directory);
    const absent = items.filter((row) => row.states[scenario] === "absent").length;
    const deferred = items.filter((row) => row.states[scenario] === "on-demand").length;
    contextFinding = absent > 0;
    explanation = absent
      ? `${names[selected]} does not receive the ${absent} configuration items here from the current launch location. Move START here to see the difference.`
      : deferred
        ? `${names[selected]} reaches the ${deferred} configuration items here on demand, when working under this directory.`
        : `All ${items.length} of ${names[selected]}’s configuration items here are received at startup. The START marker shows where both sessions launch.`;
  }

  function selectAgent(agent: Harness) {
    setSelected(agent);
    setInspection(null);
  }

  function inspect(id: string) {
    setInspection(id);
    const row = nodes.find((item) => item.path === id);
    if (row) setSelected(row.harness as Harness);
  }

  const inspectEvents = (id: string) => ({
    onClick: () => inspect(id),
    onFocus: () => inspect(id),
    onPointerEnter: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "mouse") inspect(id);
    },
  });

  return (
    <div className="scope">
      <div className="scope-layout">
        <fieldset className="scope-controls">
          <legend>Where do both agents start?</legend>
          <div className="segmented-control">
            {(Object.keys(example.scenarios) as Scenario[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={scenario === key}
                aria-controls={panelId}
                onClick={() => {
                  setScenario(key);
                  setInspection(null);
                }}
              >
                {example.scenarios[key].cwd === "." ? "Repo root" : example.scenarios[key].cwd}
              </button>
            ))}
          </div>
          <p>The same task. A different launch location.</p>
        </fieldset>

        <div className="scope-map-wrap" id={panelId} data-focus={selected}>
          <fieldset className="scope-trace">
            <legend className="visually-hidden">Trace what one agent receives</legend>
            <div className="scope-agents">
              {agents.map((agent) => (
                <button
                  key={agent}
                  type="button"
                  className="scope-agent"
                  aria-pressed={selected === agent}
                  aria-controls={panelId}
                  onClick={() => selectAgent(agent)}
                  onFocus={() => selectAgent(agent)}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") selectAgent(agent);
                  }}
                >
                  <AgentMark agent={agent} name={names[agent]} />
                  <span className="visually-hidden">{` - highlight the configuration ${names[agent]} receives`}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div
            className="scope-map"
            style={{ "--map-ratio": `600 / ${mapHeight}` } as React.CSSProperties}
          >
            <svg
              className="scope-routes"
              viewBox={`0 0 600 ${mapHeight}`}
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              {agents.map((agent) => {
                const x = agent === "claude" ? 150 : 450;
                const firstAbsent = nodes.find(
                  (row) => row.harness === agent && row.states[scenario] === "absent",
                );
                const end = firstAbsent ? firstAbsent.y - 30 : targetY - 34;
                const start = `M300 36 V48 Q300 60 ${agent === "claude" ? 288 : 312} 60 H${agent === "claude" ? 168 : 432} Q${x} 60 ${x} 78`;
                const finish = `V${targetY - 34} Q${x} ${targetY - 16} ${agent === "claude" ? 168 : 432} ${targetY - 16} H${agent === "claude" ? 288 : 312} Q300 ${targetY - 16} 300 ${targetY - 4}`;
                return (
                  <g key={agent} data-agent={agent} data-stopped={Boolean(firstAbsent)}>
                    <path className="scope-route-base" d={`${start} ${finish}`} />
                    <path
                      key={`${agent}-${scenario}`}
                      className="scope-route-active"
                      pathLength={1}
                      d={`${start} ${firstAbsent ? `V${end}` : finish}`}
                    />
                    {firstAbsent ? (
                      <>
                        <path className="scope-route-missing" d={`M${x} ${end + 12} ${finish}`} />
                        <path className="scope-route-stop" d={`M${x - 8} ${end} h16`} />
                      </>
                    ) : null}
                  </g>
                );
              })}
              {levels.slice(1).map(({ directory, y }) => (
                <path key={directory} className="scope-directory-link" d={`M150 ${y} H450`} />
              ))}
            </svg>
            <ul
              className="scope-nodes"
              aria-label={`Repository configuration, tracing ${names[selected]}`}
            >
              {levels.map(({ directory, y }) => (
                <li
                  className="scope-location"
                  key={directory}
                  data-kind={directory ? "directory" : "root"}
                  style={{ top: `${(y / mapHeight) * 100}%` }}
                >
                  <button
                    type="button"
                    aria-describedby={inspection === `@${directory}` ? contextId : undefined}
                    data-inspected={inspection === `@${directory}`}
                    {...inspectEvents(`@${directory}`)}
                  >
                    <span className="scope-wayfinding">{directory ? "Directory" : "Root"}</span>
                    <code>{directory ? `${directory}/` : "your-repo/"}</code>
                  </button>
                </li>
              ))}
              {nodes.map((row) => {
                const rowState = row.states[scenario];
                const emphasis =
                  row.harness !== selected ? "off" : rowState === "absent" ? "finding" : "on";
                return (
                  <li
                    className="scope-node"
                    key={row.path}
                    data-path={row.path}
                    data-state={rowState}
                    data-emphasis={emphasis}
                    data-kind={row.kind}
                    style={{ left: `${row.x / 6}%`, top: `${(row.y / mapHeight) * 100}%` }}
                  >
                    <button
                      type="button"
                      aria-describedby={inspectedId === row.path ? contextId : undefined}
                      data-inspected={inspectedId === row.path}
                      {...inspectEvents(row.path)}
                    >
                      <span className="scope-node-dot" aria-hidden="true">
                        {rowState === "absent" ? "×" : ""}
                      </span>
                      <code>
                        {row.kind === "skill"
                          ? `${row.name.split("/").filter(Boolean).at(-1)}/`
                          : row.name}
                      </code>
                      {row.kind === "skill" ? (
                        <span className="scope-skill-label">skill</span>
                      ) : null}
                      <span className="visually-hidden">{` - ${row.path}, ${names[row.harness as Harness]}, ${labels[rowState].toLowerCase()}`}</span>
                    </button>
                  </li>
                );
              })}
              <li
                className="scope-target"
                data-kind="target"
                style={{ top: `${(targetY / mapHeight) * 100}%` }}
              >
                <button
                  type="button"
                  data-inspected={inspection === "@target"}
                  aria-describedby={inspection === "@target" ? contextId : undefined}
                  {...inspectEvents("@target")}
                >
                  <span className="scope-wayfinding">Target</span>
                  <code>{example.target}</code>
                </button>
              </li>
            </ul>
            <span
              className="scope-start"
              style={{ top: `${(startY / mapHeight) * 100}%` }}
              aria-label={`Both agents start at ${active.cwd === "." ? "the repository root" : active.cwd}`}
            >
              <span aria-hidden="true">←</span> Start
            </span>
          </div>
        </div>

        <div
          className="scope-context"
          id={contextId}
          aria-live="polite"
          aria-atomic="true"
          data-finding={contextFinding}
        >
          <div key={`${inspectedId}-${scenario}-${selected}`}>
            <p className="scope-context-title">
              <span aria-hidden="true">{contextFinding ? "×" : "↳"}</span>
              {contextTitle}
            </p>
            <code>{contextPath}</code>
            <p>{explanation}</p>
          </div>
          <span className="scope-hint">Hover, focus, or tap a file to inspect it.</span>
        </div>
      </div>

      <div className="scope-evidence-section" id="scope-evidence">
        <div
          className="scope-result"
          aria-live="polite"
          aria-atomic="true"
          data-clear={active.findings.length === 0}
        >
          <span className="scope-result-symbol" aria-hidden="true">
            {active.findings.length ? "≠" : "="}
          </span>
          <p>
            <strong>
              {active.findings.length ? `${active.findings.length} findings` : "No findings."}
            </strong>
            <span>
              {active.equivalent} equivalent items.{" "}
              {active.findings.length
                ? "The nested instruction and skill differ in effective scope."
                : "Both agents receive matching configuration."}
            </span>
          </p>
        </div>
        <details className="scope-transcript scope-details">
          <summary>
            View evidence <span className="faq-marker" aria-hidden="true" />
          </summary>
          <ul className="scope-file-evidence">
            {example.rows.map((row) => (
              <li key={row.path}>
                <code>{row.path}</code>
                <span>{labels[row.states[scenario]]}</span>
              </li>
            ))}
          </ul>
          <ul className="scope-findings">
            {active.findings.map((finding) => (
              <li key={finding.id}>
                <p>
                  <span className="severity">{finding.severity}</span> {finding.explanation}
                </p>
                {finding.evidence.map((path) => (
                  <code key={path}>{path}</code>
                ))}
              </li>
            ))}
          </ul>
        </details>
        <details className="scope-transcript">
          <summary>
            View CLI output <span className="faq-marker" aria-hidden="true" />
          </summary>
          <pre tabIndex={0}>
            <code>{`$ playbookdiff check . --cwd ${active.cwd} --path ${example.target}\n\n${active.transcript}`}</code>
          </pre>
        </details>
      </div>
    </div>
  );
}
