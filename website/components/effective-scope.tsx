"use client";
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Narrow code surfaces must remain keyboard-scrollable. */

import { useId, useMemo, useState } from "react";
import example from "../lib/effective-scope.json";
import { AgentMark } from "./site-ui";

/**
 * The interactive effective-configuration example.
 *
 * One real repository, drawn as a filesystem tree, with the configuration each
 * harness receives traced through it. The data comes from
 * `lib/effective-scope.json`, which `scripts/generate-website-example.mjs`
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
 * The two agents are told apart by their icons, their names, and which branches
 * light up when you choose one - never by giving either of them a colour.
 */

type Scenario = keyof typeof example.scenarios;
type Harness = "claude" | "codex";
type Row = {
  path: string;
  directory: string;
  name: string;
  harness: Harness;
  kind: string;
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

/**
 * The tree, built from the generated rows rather than written out by hand.
 *
 * A skill collapses to its own directory, and `apps/api` stays one node because
 * that is exactly the launch directory the command above the tree names. The
 * result is two levels, which reads the same on a phone as on a desktop.
 */
type TreeNode = {
  id: string;
  label: string;
  kind: "root" | "directory" | "file";
  depth: number;
  /** Gutter glyphs to draw before this node, outermost first. */
  gutters: string[];
  harness?: Harness;
  states?: Record<Scenario, string>;
  /** Leaf ids underneath this node, used to decide whether a branch is reached. */
  descendants: string[];
};

function buildTree(): TreeNode[] {
  const rootRows = rows.filter((row) => row.directory === "");
  const nested = rows.filter((row) => row.directory !== "");
  const directory = nested[0]?.directory ?? "";

  const nodes: TreeNode[] = [
    {
      id: "@root",
      label: "your-repo/",
      kind: "root",
      depth: 0,
      gutters: [],
      descendants: rows.map((row) => row.path),
    },
  ];

  const leaf = (row: Row, depth: number, gutters: TreeNode["gutters"]): TreeNode => ({
    id: row.path,
    label: row.name,
    kind: "file",
    depth,
    gutters,
    harness: row.harness,
    states: row.states,
    descendants: [row.path],
  });

  rootRows.forEach((row, index) =>
    nodes.push(leaf(row, 1, [index === 0 ? "branch-first" : "branch"])),
  );

  if (nested.length > 0) {
    nodes.push({
      id: `@${directory}`,
      label: `${directory}/`,
      kind: "directory",
      depth: 1,
      // Last child of the repository root, so its gutter closes the trunk.
      gutters: ["last"],
      descendants: nested.map((row) => row.path),
    });
    nested.forEach((row, index) => {
      // The trunk has ended above, so the outer gutter is blank rather than a spine.
      const last = index === nested.length - 1;
      const first = index === 0;
      const kind = last ? (first ? "last-first" : "last") : first ? "branch-first" : "branch";
      nodes.push(leaf(row, 2, ["blank", kind]));
    });
  }

  return nodes;
}

const tree = buildTree();
const leafById = new Map(rows.map((row) => [row.path, row]));

/**
 * Whether a branch carries anything for one agent in one scenario.
 *
 * A file is reached when the analyzer put it in that harness's configuration.
 * A directory is reached when anything of that agent's underneath it is. This
 * is what makes Codex's chain visibly stop at the repository root: from
 * `cwd=.` neither of its nested files is received, so nothing below `apps/api`
 * lights up for it.
 */
function reachedBy(node: TreeNode, agent: Harness, scenario: Scenario) {
  if (node.kind === "root") return true;
  return node.descendants.some((path) => {
    const row = leafById.get(path);
    return row?.harness === agent && row.states[scenario] !== "absent";
  });
}

function ownedBy(node: TreeNode, agent: Harness) {
  if (node.kind === "file") return node.harness === agent;
  return node.descendants.some((path) => leafById.get(path)?.harness === agent);
}

// One small glyph per gutter cell, drawn in a 30x38 cell whose centre line is
// the trunk. The trunk and the stub that leaves it are separate paths: the
// trunk is shared with every sibling below, so only the stub takes a state.
//
// A last child closes with a gentle corner. A first child starts above its own
// row, just clear of the parent's text, so the trunk visibly descends out of
// the parent rather than appearing beneath it.
const glyphs: Record<string, { trunk?: string; stub?: string }> = {
  spine: { trunk: "M15 0 V38" },
  blank: {},
  branch: { trunk: "M15 0 V38", stub: "M15 19 H30" },
  "branch-first": { trunk: "M15 -9 V38", stub: "M15 19 H30" },
  last: { trunk: "M15 0 V12", stub: "M15 12 Q15 19 22 19 H30" },
  "last-first": { trunk: "M15 -9 V12", stub: "M15 12 Q15 19 22 19 H30" },
};

function Gutter({ kind }: { kind: string }) {
  const { trunk, stub } = glyphs[kind];
  return (
    <svg
      className="scope-gutter"
      viewBox="0 0 30 38"
      // The cell narrows on small screens; stretching rather than fitting keeps
      // the trunk on the centre line instead of letterboxing the glyph.
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* pathLength normalises every path to 1, so one dashoffset animation
          draws a long trunk and a short corner at the same rate. */}
      {trunk ? <path className="scope-trunk" d={trunk} pathLength={1} /> : null}
      {stub ? <path className="scope-stub" d={stub} pathLength={1} /> : null}
    </svg>
  );
}

export function EffectiveScope() {
  const [scenario, setScenario] = useState<Scenario>("root");
  const [pinned, setPinned] = useState<Harness | null>(null);
  const [hovered, setHovered] = useState<Harness | null>(null);
  const active = example.scenarios[scenario];
  const panelId = useId();

  // Pointer and keyboard both preview an agent; a click keeps it, which is what
  // makes this work on a touch screen where there is no hover at all.
  const focus = pinned ?? hovered;

  const nodes = useMemo(
    () =>
      tree.map((node) => {
        const state = node.states?.[scenario];
        let emphasis: "neutral" | "on" | "off" | "finding" = "neutral";

        if (focus) {
          if (node.kind === "root") emphasis = "on";
          else if (!ownedBy(node, focus)) emphasis = "off";
          else if (node.kind === "file") emphasis = state === "absent" ? "finding" : "on";
          else emphasis = reachedBy(node, focus, scenario) ? "on" : "off";
        } else if (state === "absent") {
          emphasis = "finding";
        }

        return { node, state, emphasis };
      }),
    [scenario, focus],
  );

  const agentControl = (agent: Harness) => (
    <button
      key={agent}
      type="button"
      className="scope-agent"
      aria-pressed={pinned === agent}
      aria-controls={panelId}
      onClick={() => setPinned(pinned === agent ? null : agent)}
      onMouseEnter={() => setHovered(agent)}
      onMouseLeave={() => setHovered(null)}
      onFocus={() => setHovered(agent)}
      onBlur={() => setHovered(null)}
    >
      <AgentMark agent={agent} name={agentNames[agent]} />
      <span className="visually-hidden">
        {` - highlight the configuration ${agentNames[agent]} receives`}
      </span>
    </button>
  );

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

      <div className="scope-panel" id={panelId} data-focus={focus ?? undefined}>
        <div className="scope-bar">
          <code>
            <span aria-hidden="true">$ </span>
            {`playbookdiff check . --cwd ${active.cwd} --path ${example.target}`}
          </code>
        </div>

        <fieldset className="scope-trace">
          <legend>Trace what one agent receives</legend>
          <div className="scope-agents">{(["claude", "codex"] as Harness[]).map(agentControl)}</div>
        </fieldset>

        {/* Re-keying on the scenario restarts the branch animation, so switching
            the launch directory redraws the tree outward from the root. */}
        <ul className="scope-tree" key={scenario}>
          {nodes.map(({ node, state, emphasis }, index) => (
            <li
              className={node.kind === "file" ? "scope-row" : "scope-branch"}
              key={node.id}
              data-state={state}
              data-emphasis={emphasis}
              data-kind={node.kind}
              style={{ "--i": index } as React.CSSProperties}
            >
              {node.gutters.map((kind, depth) => (
                <Gutter key={`${node.id}-${depth}`} kind={kind} />
              ))}
              <code className="scope-path">{node.label}</code>
              {node.harness && state ? (
                <span className="scope-verdict">
                  <AgentMark agent={node.harness} name={agentNames[node.harness]} compact />
                  <span className="scope-state">
                    {states[state].short}
                    <span className="visually-hidden"> - {states[state].long}</span>
                  </span>
                </span>
              ) : null}
            </li>
          ))}
        </ul>

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
