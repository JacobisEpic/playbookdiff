/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Scrollable code blocks must be reachable for keyboard scrolling at narrow widths. */
import { ExampleReport } from "../components/example-report";
import { site, sourceUrl } from "../lib/site";

const capabilities = [
  [
    "01",
    "Instructions",
    "Compare exact content, applicability, and load phase. Different wording stays unknown, not a guessed conflict.",
    "CLAUDE.md ↔ AGENTS.md",
  ],
  [
    "02",
    "Skills",
    "Find missing counterparts and differences in discovery, explicit or implicit invocation, and advertisement.",
    ".claude/skills ↔ .agents/skills",
  ],
  [
    "03",
    "MCP configuration",
    "Compare configured servers, transports, commands, arguments, and environment references. Not runtime connections.",
    ".mcp.json ↔ .codex/config.toml",
  ],
  [
    "04",
    "Scope & discovery",
    "Separate where an agent starts from what it is working on. Nested configuration is not discovered the same way.",
    "cwd ≠ targetPath",
  ],
  [
    "05",
    "Git regressions",
    "Compare two committed revisions. Separate introduced, resolved, and unchanged findings with stable IDs.",
    "baseline..candidate",
  ],
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#main" aria-label="PlaybookDiff home">
            <span className="brand-mark" aria-hidden="true">
              [−]
            </span>
            PlaybookDiff<span className="brand-label">OSS</span>
          </a>
          <nav aria-label="Main navigation">
            <a href="#example">Example</a>
            <a href="#workflow">CLI</a>
            <a href="#how-it-works">How it works</a>
            <a href={site.repository} className="nav-github">
              GitHub <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </div>
      </header>
      <main id="main">
        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" /> For multi-agent repositories
            </p>
            <h1 id="hero-title">
              Same repo.
              <br />
              Different agents.
              <br />
              <span>Know the difference.</span>
            </h1>
            <p className="hero-description">
              Catch repository-configuration drift between Claude Code and Codex before it lands.
            </p>
            <p className="hero-detail">
              PlaybookDiff compiles what each harness receives from your repository and reports
              deterministic differences, with evidence.
            </p>
            <div className="hero-actions">
              <a className="button primary" href={site.repository}>
                View on GitHub <span aria-hidden="true">↗</span>
              </a>
              <a className="button secondary" href="#workflow">
                Explore the CLI <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
          <div className="hero-terminal" aria-label="Illustrative CLI workflow">
            <div className="terminal-bar">
              <span>
                <i />
                <i />
                <i />
              </span>
              <span>playbookdiff / workflow</span>
              <span>CLI</span>
            </div>
            <div className="terminal-content">
              <p className="terminal-comment"># One repository. Two effective configs.</p>
              <pre>
                <code>
                  <span className="prompt">$</span> playbookdiff check .
                </code>
              </pre>
              <div className="terminal-pair">
                <span>Claude Code</span>
                <span aria-hidden="true">↔</span>
                <span>Codex</span>
              </div>
              <div className="terminal-dimensions">
                <div>
                  <span>instructions</span>
                  <span>content + scope</span>
                </div>
                <div>
                  <span>skills</span>
                  <span>discovery + invocation</span>
                </div>
                <div>
                  <span>MCP</span>
                  <span>configured capabilities</span>
                </div>
              </div>
              <div className="terminal-divider" />
              <p className="terminal-comment"># Review only what this revision changes.</p>
              <pre>
                <code>
                  <span className="prompt">$</span> playbookdiff diff main..HEAD
                </code>
              </pre>
              <div className="delta-legend">
                <span>+ introduced</span>
                <span>− resolved</span>
                <span>= unchanged</span>
              </div>
              <p className="terminal-footnote">Structured evidence. No model calls.</p>
            </div>
          </div>
        </section>

        <div className="principles">
          <div className="container principles-inner">
            <span>
              <b>Read-only</b> by design
            </span>
            <span>
              <b>Deterministic</b> by default
            </span>
            <span>
              <b>Local analysis</b> without API keys
            </span>
            <span>
              <b>MIT</b> licensed
            </span>
          </div>
        </div>

        <section className="section container" id="example" aria-labelledby="example-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / See the difference</p>
              <h2 id="example-title">
                Your launch directory
                <br />
                is part of the configuration.
              </h2>
            </div>
            <p>
              The same target can produce a different report. Change the launch directory in this
              fixture-backed example.
            </p>
          </div>
          <ExampleReport />
          <p className="caption">
            Static example from{" "}
            <a href={sourceUrl("packages/harness-codex/src/cross-harness.test.ts")}>
              the checked-in Scenario A/B fixture ↗
            </a>{" "}
            at baseline <code>1bb3384</code>. This browser does not analyze your repository.
          </p>
        </section>

        <section className="workflow-section" id="workflow" aria-labelledby="workflow-title">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">02 / A small, useful workflow</p>
                <h2 id="workflow-title">
                  Inspect. Understand.
                  <br />
                  Catch the next regression.
                </h2>
              </div>
              <p>
                Three commands, one deterministic engine. Keep native configuration files. Make
                their differences visible.
              </p>
            </div>
            <div className="command-grid">
              <article className="command-card">
                <span className="step-number">01</span>
                <h3>Check your repository</h3>
                <pre tabIndex={0} aria-label="Check command">
                  <code>playbookdiff check .</code>
                </pre>
                <p>
                  See effective instructions, skills, and MCP differences for the selected context.
                </p>
              </article>
              <article className="command-card">
                <span className="step-number">02</span>
                <h3>Understand a finding</h3>
                <pre tabIndex={0} aria-label="Explain command">
                  <code>{"playbookdiff explain <finding-id> ."}</code>
                </pre>
                <p>
                  Follow a stable finding ID back to its explanation and source evidence. Use the
                  same cwd and target.
                </p>
              </article>
              <article className="command-card">
                <span className="step-number">03</span>
                <h3>Check a proposed change</h3>
                <pre tabIndex={0} aria-label="Diff command">
                  <code>playbookdiff diff main..HEAD</code>
                </pre>
                <p>
                  New medium/high findings exit 1; existing debt does not. Analysis errors exit 2.
                </p>
              </article>
            </div>
            <div className="source-install">
              <div>
                <span className="eyebrow">Build from source</span>
                <p>
                  Public package installation is not assumed.
                  <br />
                  Node 24.11+ within 24.x · pnpm 11.24.0
                </p>
              </div>
              <details>
                <summary>
                  Source checkout commands <span aria-hidden="true">+</span>
                </summary>
                <pre tabIndex={0} aria-label="Source installation commands">
                  <code>
                    {"pnpm install\npnpm --filter playbookdiff build\npnpm playbookdiff check ."}
                  </code>
                </pre>
                <p>
                  Run from a PlaybookDiff source checkout. Examples above use the executable name;
                  the checkout uses <code>pnpm playbookdiff</code>.
                </p>
              </details>
              <a href={sourceUrl("docs/cli.md")}>Full CLI reference ↗</a>
            </div>
          </div>
        </section>

        <section
          className="section container"
          id="capabilities"
          aria-labelledby="capabilities-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">03 / Configuration, not guesswork</p>
              <h2 id="capabilities-title">Five places drift hides.</h2>
            </div>
            <p>
              A nested instruction. A missing skill. A changed server. Small configuration changes
              can create a different effective setup.
            </p>
          </div>
          <div className="capability-list">
            {capabilities.map(([number, title, description, syntax]) => (
              <article className="capability" key={number}>
                <span className="index-number">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
                <code>{syntax}</code>
              </article>
            ))}
          </div>
        </section>

        <section
          className="architecture-section"
          id="how-it-works"
          aria-labelledby="architecture-title"
        >
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">04 / Follow the evidence</p>
                <h2 id="architecture-title">
                  Native inputs.
                  <br />A shared model. A clear report.
                </h2>
              </div>
              <p>
                Harness-specific discovery stays inside adapters. The comparator works only on
                normalized configuration, preserving provenance and uncertainty.
              </p>
            </div>
            <div
              className="architecture"
              aria-label="Repository context flows through Claude and Codex adapters into normalized configurations, then the deterministic comparator and a compatibility report"
            >
              <div className="architecture-input">
                <span className="field-label">Analysis context</span>
                <code>Repository + cwd + targetPath</code>
              </div>
              <div className="flow-arrow" aria-hidden="true">
                ↓
              </div>
              <div className="adapter-row">
                <div>
                  <span className="adapter-tag">C</span>
                  <strong>Claude adapter</strong>
                  <code>EffectiveAgentConfig</code>
                </div>
                <span className="adapter-plus" aria-hidden="true">
                  +
                </span>
                <div>
                  <span className="adapter-tag codex-tag">X</span>
                  <strong>Codex adapter</strong>
                  <code>EffectiveAgentConfig</code>
                </div>
              </div>
              <div className="flow-arrow" aria-hidden="true">
                ↓
              </div>
              <div className="comparator-node">
                <span aria-hidden="true">[−]</span>
                <strong>Deterministic comparator</strong>
                <span>No network. No model calls.</span>
              </div>
              <div className="flow-arrow" aria-hidden="true">
                ↓
              </div>
              <div className="report-node">
                <code>CompatibilityReport</code>
                <span>Findings + source evidence + uncertainty</span>
              </div>
            </div>
            <div className="git-flow">
              <p>
                <span className="field-label">Across Git revisions</span>Baseline report + candidate
                report
              </p>
              <span aria-hidden="true">→</span>
              <p>Stable finding IDs</p>
              <span aria-hidden="true">→</span>
              <div>
                <span className="delta introduced">+ introduced</span>
                <span className="delta resolved">− resolved</span>
                <span className="delta unchanged">= unchanged</span>
              </div>
            </div>
            <p className="caption">
              Git diff analyzes committed snapshots, not uncommitted edits. It does not fetch remote
              refs. <a href={sourceUrl("docs/git-diff.md")}>Read the regression semantics ↗</a>
            </p>
          </div>
        </section>

        <section
          className="section container boundaries"
          id="limits"
          aria-labelledby="boundaries-title"
        >
          <div>
            <p className="eyebrow">05 / Honest boundaries</p>
            <h2 id="boundaries-title">
              Unknown is better
              <br />
              than guessed.
            </h2>
            <p className="boundary-intro">
              PlaybookDiff checks repository-defined configuration, not machine-effective state or
              model behavior. When it cannot prove a relationship, it reports uncertainty.
            </p>
            <div className="unknown-example">
              <div>
                <span className="severity info">Info</span>
                <span className="finding-category">semantic relationship unknown</span>
              </div>
              <blockquote>
                “Run tests before pushing.”
                <br />
                <span>↔</span>
                <br />
                “Make sure the test suite passes before you push.”
              </blockquote>
              <p>Different text is a fact. Incompatibility is not.</p>
              <a
                href={sourceUrl(
                  "packages/harness-codex/test/fixtures/comparison/semantic-unknown",
                  "tree",
                )}
              >
                View the wording fixture ↗
              </a>
            </div>
          </div>
          <div className="limits-panel">
            <h3>What it deliberately does not do</h3>
            <ul>
              <li>Benchmark models or guarantee identical behavior</li>
              <li>Rewrite or synchronize Claude/Codex configuration</li>
              <li>Infer arbitrary prose semantics</li>
              <li>Resolve secrets or hidden machine configuration</li>
              <li>Run coding agents or execute analyzed repository scripts</li>
              <li>Connect to MCP servers or discover runtime capabilities</li>
            </ul>
            <div className="equivalent-note">
              <span className="equivalent-mark">✓</span>
              <p>
                <strong>Different syntax can still be equivalent.</strong>
                <br />
                The native-layout parity fixture reports zero findings across instructions, skills,
                and MCP.
              </p>
            </div>
          </div>
        </section>

        <section className="closing container" aria-labelledby="closing-title">
          <div>
            <p className="eyebrow">Keep your native playbooks.</p>
            <h2 id="closing-title">Make the differences visible.</h2>
            <p>
              Built for developers, maintainers, and teams working across coding agents. Inspect the
              implementation. Contribute a fixture. Help define what compatibility means.
            </p>
          </div>
          <a className="button primary" href={site.repository}>
            Explore PlaybookDiff <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>
      <footer className="site-footer container">
        <a className="brand" href="#main">
          <span className="brand-mark" aria-hidden="true">
            [−]
          </span>
          PlaybookDiff
        </a>
        <p>Deterministic analysis. Explicit uncertainty.</p>
        <nav aria-label="Footer navigation">
          <a href={sourceUrl("LICENSE")}>MIT License</a>
          <a href={sourceUrl("CONTRIBUTING.md")}>Contribute</a>
          <a href={sourceUrl("CODE_OF_CONDUCT.md")}>Code of Conduct</a>
        </nav>
      </footer>
    </>
  );
}
