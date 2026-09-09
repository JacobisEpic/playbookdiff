"use client";
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Terminal output must remain keyboard-scrollable. */

import { useEffect, useId, useRef, useState } from "react";
import example from "../lib/effective-scope.json";
import { AgentMark } from "./site-ui";

type Scenario = keyof typeof example.scenarios;
type Harness = "claude" | "codex";
const agents: Harness[] = ["claude", "codex"];
const names = { claude: "Claude Code", codex: "Codex" };
const labels: Record<string, string> = {
  startup: "at startup",
  "on-demand": "on demand",
  absent: "not received",
};

// Layout is derived from the fixture, including skill directories and the target.
// Only geometry lives here. Discovery states and findings belong to the generator.
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
const chapters = ["Repository", "Claude", "Codex", "The difference"];
const rootMissing = example.rows.filter((row) => row.states.root === "absent");
const rootDeferred = example.rows.filter((row) => row.states.root === "on-demand");

const beats = [
  {
    title: "Same repository. Same task.",
    text: "Matching instructions and skills, at the root and deeper down. Both agents start at the root and work on the same file.",
    note: "Matching files are not matching configuration.",
  },
  {
    title: "Claude follows the work.",
    text: `Claude Code reaches ${rootDeferred.length} nested configuration items on demand as it works under the target directory.`,
    note: "The deeper instructions join the effective configuration.",
  },
  {
    title: "Codex starts from the launch.",
    text: `From the repository root, ${rootMissing.length} nested configuration items never enter Codex’s effective configuration.`,
    note: "Instruction discovery stops here. The target file is still the same.",
  },
  {
    title: "Same code. Different playbook.",
    text: "The files match. What the agents receive doesn’t. PlaybookDiff traces the difference back to its source.",
    note: `${example.scenarios.root.findings.length} findings. Every one backed by evidence.`,
  },
];

export function EffectiveScope() {
  const [scenario, setScenario] = useState<Scenario>("root");
  const [selected, setSelected] = useState<Harness>("claude");
  const [step, setStep] = useState(0);
  const [manual, setManual] = useState(false);
  const [scrollStory, setScrollStory] = useState(false);
  const story = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const active = example.scenarios[scenario];
  const focus = manual ? selected : step === 1 ? "claude" : step === 2 ? "codex" : null;

  useEffect(() => {
    // No pinned region on phones, short windows, or with reduced motion.
    // Without JS the compact first scene and all generated evidence still render.
    const query = matchMedia(
      "(min-width: 900px) and (min-height: 780px) and (prefers-reduced-motion: no-preference)",
    );
    const update = () => setScrollStory(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!scrollStory || manual) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!story.current || !stage.current) return;
      const rect = story.current.getBoundingClientRect();
      const distance = story.current.offsetHeight - stage.current.offsetHeight;
      const progress = Math.max(0, Math.min(1, (94 - rect.top) / distance));
      setStep(Math.min(3, Math.floor(progress * 4)));
      stage.current.style.setProperty("--story-progress", String(progress));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [scrollStory, manual]);

  function goToStep(next: number) {
    setManual(false);
    setScenario("root");
    setStep(next);
    if (scrollStory && story.current && stage.current) {
      const top = window.scrollY + story.current.getBoundingClientRect().top - 94;
      const distance = story.current.offsetHeight - stage.current.offsetHeight;
      // Chapter navigation is ordinary page scrolling, never wheel interception.
      window.scrollTo({ top: top + distance * ((next + 0.12) / 4), behavior: "instant" });
    }
  }

  function explore() {
    setManual(true);
    setStep(3);
    if (scrollStory && story.current && stage.current) {
      window.scrollTo({
        top:
          window.scrollY +
          story.current.getBoundingClientRect().top +
          story.current.offsetHeight -
          stage.current.offsetHeight -
          94,
        behavior: "instant",
      });
    }
  }

  const selectedRows = nodes.filter((row) => row.harness === selected);
  const missing = selectedRows.filter((row) => row.states[scenario] === "absent");
  const deferred = selectedRows.filter((row) => row.states[scenario] === "on-demand");
  const annotation = manual
    ? missing.length
      ? `${missing.length} nested items not received. Discovery is anchored to the launch directory.`
      : deferred.length
        ? `${deferred.length} nested items received on demand, on the way to the target.`
        : `All ${selectedRows.length} configuration items received at startup.`
    : beats[step].note;

  return (
    <div className="scope">
      <div className="scope-story" ref={story} data-scroll={scrollStory}>
        <div className="scope-stage" ref={stage} data-step={step} data-manual={manual}>
          <div className="scope-story-top">
            <p className="eyebrow">One repository. Two instruction paths.</p>
            <button className="text-button scope-explore" type="button" onClick={explore}>
              Explore the example <span aria-hidden="true">↗</span>
            </button>
          </div>

          <div className="scope-composition">
            <div className="scope-narrative">
              <nav className="scope-chapters" aria-label="Example story chapters">
                {chapters.map((chapter, index) => (
                  <button
                    key={chapter}
                    type="button"
                    aria-label={`${index + 1}. ${chapter}`}
                    aria-current={!manual && step === index ? "step" : undefined}
                    aria-controls={panelId}
                    onClick={() => goToStep(index)}
                  >
                    <span aria-hidden="true">0{index + 1}</span>
                  </button>
                ))}
              </nav>
              <div className="scope-copy" key={manual ? "explore" : step}>
                <h3>{manual ? "Change the launch. See what changes." : beats[step].title}</h3>
                <p>
                  {manual
                    ? "Keep the repository and target fixed. Change where the session starts, then follow either agent’s effective instructions."
                    : beats[step].text}
                </p>
              </div>
              <div
                className="scope-annotation"
                data-finding={manual ? missing.length > 0 : step >= 2}
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="scope-annotation-mark" aria-hidden="true">
                  {(manual ? missing.length > 0 : step >= 2) ? "≠" : "↳"}
                </span>
                <p>{annotation}</p>
              </div>
              <div className="scope-step-action">
                {step < 3 && !manual ? (
                  <button className="text-button" type="button" onClick={() => goToStep(step + 1)}>
                    {scrollStory ? "Scroll to follow, or continue" : "Continue the story"}{" "}
                    <span aria-hidden="true">↓</span>
                  </button>
                ) : (
                  <a className="text-button" href="#scope-evidence">
                    Inspect the evidence <span aria-hidden="true">↓</span>
                  </a>
                )}
              </div>
            </div>

            <div className="scope-map-wrap" id={panelId} data-focus={focus ?? "both"}>
              <div className="scope-route-labels" aria-hidden="true">
                {agents.map((agent) => (
                  <AgentMark key={agent} agent={agent} name={names[agent]} />
                ))}
              </div>
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
                          className="scope-route-active"
                          pathLength={1}
                          d={`${start} ${firstAbsent ? `V${end}` : finish}`}
                        />
                        {firstAbsent ? (
                          <>
                            <path
                              className="scope-route-missing"
                              d={`M${x} ${end + 12} ${finish}`}
                            />
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
                  aria-label={`Repository configuration${focus ? `, tracing ${names[focus]}` : ""}`}
                >
                  {levels.map(({ directory, y }) => (
                    <li
                      className="scope-location"
                      key={directory}
                      data-kind={directory ? "directory" : "root"}
                      style={{ top: `${(y / mapHeight) * 100}%` }}
                    >
                      <span className="scope-wayfinding">{directory ? "Directory" : "Root"}</span>
                      <code>{directory ? `${directory}/` : "your-repo/"}</code>
                    </li>
                  ))}
                  {nodes.map((row) => {
                    const state = row.states[scenario];
                    const emphasis =
                      focus && row.harness !== focus
                        ? "off"
                        : state === "absent"
                          ? "finding"
                          : "on";
                    return (
                      <li
                        className="scope-node"
                        key={row.path}
                        data-path={row.path}
                        data-state={state}
                        data-emphasis={emphasis}
                        data-kind={row.kind}
                        data-nested={Boolean(row.directory)}
                        style={{ left: `${row.x / 6}%`, top: `${(row.y / mapHeight) * 100}%` }}
                        title={`${row.path}: ${labels[state]}`}
                      >
                        <span className="scope-node-dot" aria-hidden="true">
                          {state === "absent" ? "×" : ""}
                        </span>
                        <code>
                          {row.kind === "skill"
                            ? `${row.name.split("/").filter(Boolean).at(-1)}/`
                            : row.name}
                        </code>
                        {row.kind === "skill" ? (
                          <span className="scope-skill-label">skill</span>
                        ) : null}
                        <span className="visually-hidden">{` - ${row.path}, ${names[row.harness as Harness]}, ${labels[state]}`}</span>
                      </li>
                    );
                  })}
                  <li
                    className="scope-target"
                    data-kind="target"
                    style={{ top: `${(targetY / mapHeight) * 100}%` }}
                  >
                    <span className="scope-wayfinding">Target</span>
                    <code>{example.target}</code>
                  </li>
                </ul>
              </div>
              <p className="scope-map-caption">
                {manual ? `Launch: ${active.cwd}` : "Both sessions launch from the repository root"}
              </p>
            </div>
          </div>

          <div className="scope-exploration" hidden={step < 3 && !manual}>
            <fieldset className="scope-trace">
              <legend>Trace what one agent receives</legend>
              <div className="scope-agents">
                {agents.map((agent) => (
                  <button
                    key={agent}
                    type="button"
                    className="scope-agent"
                    aria-pressed={focus === agent}
                    aria-controls={panelId}
                    onClick={() => {
                      setManual(true);
                      setSelected(agent);
                    }}
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") {
                        setManual(true);
                        setSelected(agent);
                      }
                    }}
                    onFocus={() => {
                      setManual(true);
                      setSelected(agent);
                    }}
                  >
                    <AgentMark agent={agent} name={names[agent]} />
                    <span className="visually-hidden">{` - highlight the configuration ${names[agent]} receives`}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="scope-controls">
              <legend>Both agents were launched from</legend>
              <div className="segmented-control">
                {(Object.keys(example.scenarios) as Scenario[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={scenario === key}
                    aria-controls={panelId}
                    onClick={() => {
                      setScenario(key);
                      setManual(true);
                    }}
                  >
                    {example.scenarios[key].cwd === "."
                      ? "the repository root"
                      : example.scenarios[key].cwd}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="scope-progress" aria-hidden="true">
            <span />
          </div>
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
          <div>
            <p className="eyebrow">PlaybookDiff finds the difference</p>
            <h3>
              {active.findings.length
                ? `${active.findings.length} findings, ${active.equivalent} equivalent`
                : `No findings. ${active.equivalent} equivalent items.`}
            </h3>
            <p>
              {active.findings.length
                ? "An instruction missing. A skill out of reach."
                : "Launching in the nested directory brings both agents’ configuration into alignment."}
            </p>
          </div>
        </div>
        <details className="scope-transcript scope-details">
          <summary>
            Configuration and finding evidence <span className="faq-marker" aria-hidden="true" />
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
            The terminal output for this run <span className="faq-marker" aria-hidden="true" />
          </summary>
          <pre tabIndex={0}>
            <code>{`$ playbookdiff check . --cwd ${active.cwd} --path ${example.target}\n\n${active.transcript}`}</code>
          </pre>
        </details>
      </div>
    </div>
  );
}
