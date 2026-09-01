/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Narrow code surfaces must remain keyboard-scrollable. */
import { ExampleReport } from "../components/example-report";
import {
  Badge,
  ButtonLink,
  Kicker,
  Logo,
  ProductFrame,
  SectionHeader,
} from "../components/site-ui";
import examples from "../lib/examples.json";
import { evidenceUrl, receiptSummary, repositoryUrl, site } from "../lib/site";

const commands = [
  {
    name: "Check",
    command: "playbookdiff check .",
    description: "Inspect effective instructions, skills, MCP, and scope.",
  },
  {
    name: "Explain",
    command: "playbookdiff explain <finding-id> .",
    description: "Trace one stable finding back to source evidence.",
  },
  {
    name: "Protect",
    command: "playbookdiff diff origin/main..HEAD",
    description: "Fail only when this change adds actionable drift.",
  },
];

const surfaces = [
  {
    surface: "Instructions",
    claude: "CLAUDE.md, .claude/rules/",
    codex: "AGENTS.md",
    compared: "Exact content, effective scope, and load phase. Different wording stays unknown.",
  },
  {
    surface: "Skills",
    claude: ".claude/skills/",
    codex: ".agents/skills/",
    compared: "Discovery state and invocation policy, never skill bodies.",
  },
  {
    surface: "MCP servers",
    claude: ".mcp.json",
    codex: ".codex/config.toml",
    compared: "Transport, command, arguments, and environment references.",
  },
  {
    surface: "Git revisions",
    claude: "BASE..HEAD",
    codex: "BASE..HEAD",
    compared: "Findings matched by stable ID, so only new drift is actionable.",
  },
];

const guarantees = [
  ["No model calls", "Repository content never leaves for inference."],
  ["Read-only", "Analysis never edits the repository it checks."],
  ["No project execution", "No scripts, skills, binaries, or repository hooks run."],
  ["Secrets stay unresolved", "Values remain symbolic or redacted in output."],
  ["Unknown beats guessed", "Unprovable relationships stay informational."],
];

function HeroReport() {
  const report = examples.root;

  return (
    <figure className="hero-report">
      <ProductFrame
        className="hero-product-frame"
        label="Fixture-backed report"
        meta={"baseline " + examples.baseline.slice(0, 7)}
      >
        <div className="hero-command">
          <span aria-hidden="true">$</span>
          <code>playbookdiff check . --path apps/api/file.ts</code>
        </div>
        <div className="hero-context-row">
          <span>
            cwd <code>.</code>
          </span>
          <span>
            target <code>{examples.target}</code>
          </span>
        </div>
        <div className="hero-agent-grid">
          <article>
            <header>
              <span className="agent-mark agent-mark-claude" aria-hidden="true">
                C
              </span>
              <div>
                <strong>Claude Code</strong>
                <span>{receiptSummary(report.claude)}</span>
              </div>
            </header>
            <ul>
              {report.claude.instructions.map((item) => (
                <li key={item}>
                  <span aria-hidden="true">✓</span>
                  <code>{item}</code>
                </li>
              ))}
              <li>
                <span aria-hidden="true">✓</span>
                <code>root-skill + api-skill</code>
              </li>
            </ul>
          </article>
          <article>
            <header>
              <span className="agent-mark agent-mark-codex" aria-hidden="true">
                X
              </span>
              <div>
                <strong>Codex</strong>
                <span>{receiptSummary(report.codex)}</span>
              </div>
            </header>
            <ul>
              <li>
                <span aria-hidden="true">✓</span>
                <code>AGENTS.md</code>
              </li>
              <li className="hero-missing">
                <span aria-hidden="true">−</span>
                <code>apps/api/AGENTS.md</code>
              </li>
              <li className="hero-missing">
                <span aria-hidden="true">−</span>
                <code>api-skill</code>
              </li>
            </ul>
          </article>
        </div>
        <div className="hero-result">
          <div className="hero-result-heading">
            <Badge tone="warm">2 medium findings</Badge>
            <span>Deterministic</span>
          </div>
          {report.findings.map((finding) => (
            <div className="hero-finding-row" key={finding.type}>
              <span>{finding.category}</span>
              <strong>{finding.title}</strong>
            </div>
          ))}
        </div>
      </ProductFrame>
      <figcaption>
        Real assertions from the checked-in <code>cwd</code>/<code>targetPath</code> fixture.
      </figcaption>
    </figure>
  );
}

function RegressionVisual() {
  return (
    <figure className="regression-visual">
      <ProductFrame label="PlaybookDiff / GitHub Step Summary" meta="fixture · Case D">
        <div className="regression-timeline">
          <article>
            <span className="timeline-label">Baseline</span>
            <strong>1 existing finding</strong>
            <p>Claude-only root instruction</p>
            <Badge>Pre-existing debt</Badge>
          </article>
          <span className="timeline-arrow" aria-hidden="true">
            →
          </span>
          <article>
            <span className="timeline-label">Candidate</span>
            <strong>1 existing + 1 new</strong>
            <p>
              Added <code>.claude/skills/deploy/SKILL.md</code>
            </p>
            <Badge tone="warm">New skill gap</Badge>
          </article>
        </div>
        <div className="action-result-card">
          <div className="action-result-title">
            <span className="action-fail" aria-hidden="true">
              ×
            </span>
            <div>
              <span>Result</span>
              <strong>1 new actionable compatibility regression</strong>
            </div>
          </div>
          <div className="action-finding">
            <Badge tone="warm">Medium</Badge>
            <div>
              <strong>Skill capability gap</strong>
              <p>Claude Code receives the deploy skill. Codex has no counterpart.</p>
            </div>
          </div>
          <div className="action-existing">
            <span>Existing</span>
            <p>1 pre-existing finding remains unchanged and is not counted as new.</p>
          </div>
        </div>
      </ProductFrame>
      <figcaption>
        Verified against the baseline-debt-plus-new-regression fixture in{" "}
        <a href={evidenceUrl("packages/cli/src/commands/diff.test.ts")}>the diff test suite ↗</a>.
      </figcaption>
    </figure>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="hero-surface" id="top">
        <header className="site-header">
          <div className="container header-inner">
            <a className="brand-link" href="#top" aria-label="PlaybookDiff home">
              <Logo />
            </a>
            <nav aria-label="Main navigation">
              <a className="nav-optional" href="#demo">
                Product
              </a>
              <a className="nav-optional" href="#ci">
                CI
              </a>
              <a className="nav-optional" href="#how-it-works">
                How it works
              </a>
              <a className="nav-docs" href={repositoryUrl("docs/cli.md")}>
                Docs <span aria-hidden="true">↗</span>
              </a>
              <a className="nav-cta" href="#get-started">
                Get started <span aria-hidden="true">→</span>
              </a>
            </nav>
          </div>
        </header>

        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <Kicker tone="dark">
              <span className="status-dot" /> Open-source configuration analysis
            </Kicker>
            <h1 id="hero-title">
              Same repo.
              <br />
              Different agents.
              <br />
              <span>Know the difference.</span>
            </h1>
            <p className="hero-lead">
              Claude Code and Codex can receive different instructions, skills, and MCP
              configuration from the same repository. PlaybookDiff shows exactly where they diverge
              and catches new drift before it lands.
            </p>
            <div className="hero-actions">
              <ButtonLink href="#demo">See a real report</ButtonLink>
              <ButtonLink href={site.repository} variant="ghost" external>
                View on GitHub
              </ButtonLink>
            </div>
            <ul className="hero-runways" aria-label="Ways to run PlaybookDiff">
              <li>
                <span>Local CLI</span>
                <code>playbookdiff check .</code>
              </li>
              <li>
                <span>GitHub Action</span>
                <code>{`uses: ${site.actionRef}`}</code>
              </li>
            </ul>
          </div>
          <HeroReport />
        </section>

        <div className="trust-strip" aria-label="Project principles">
          <div className="container trust-strip-inner">
            <span>
              <b>Read-only</b> analysis
            </span>
            <span>
              <b>Deterministic</b> evidence
            </span>
            <span>
              <b>No model</b> or API keys
            </span>
            <span>
              <b>MIT</b> licensed
            </span>
          </div>
        </div>
      </div>

      <main id="main">
        <section className="section demo-section container" id="demo" aria-labelledby="demo-title">
          <SectionHeader
            id="demo-title"
            kicker="The launch directory is configuration"
            title={
              <>
                One target.
                <br />
                Two different reports.
              </>
            }
            description="Switch only the launch directory. The fixture moves from two actionable gaps to a fully equivalent result."
          />
          <ExampleReport />
          <p className="caption">
            Static presentation of assertions pinned to <code>
              {examples.baseline.slice(0, 7)}
            </code>{" "}
            in <a href={evidenceUrl(examples.source)}>the checked-in cross-harness fixture ↗</a>.
            This browser does not inspect your repository.
          </p>
        </section>

        <section className="ci-section" id="ci" aria-labelledby="ci-title">
          <div className="container ci-layout">
            <div className="ci-copy">
              <Kicker tone="dark">Regression-aware CI</Kicker>
              <h2 id="ci-title">Existing debt does not make every pull request fail.</h2>
              <p>
                PlaybookDiff matches findings by stable ID across two committed revisions. Only a
                new medium or high finding fails the change.
              </p>
              <ul className="ci-rules">
                <li>
                  <span className="rule-symbol rule-introduced">+</span>
                  <div>
                    <strong>Introduced actionable</strong>
                    <span>Fail</span>
                  </div>
                </li>
                <li>
                  <span className="rule-symbol rule-unchanged">=</span>
                  <div>
                    <strong>Unchanged debt</strong>
                    <span>Pass</span>
                  </div>
                </li>
                <li>
                  <span className="rule-symbol rule-resolved">−</span>
                  <div>
                    <strong>Resolved finding</strong>
                    <span>Pass</span>
                  </div>
                </li>
              </ul>
              <div className="action-usage">
                <span className="action-usage-label">
                  <span className="status-dot status-dot-success" /> Released as{" "}
                  <code>{site.release}</code>
                </span>
                <pre tabIndex={0} aria-label="GitHub Actions workflow using PlaybookDiff">
                  <code>
                    <span className="command-comment"># .github/workflows/playbookdiff.yml</span>
                    {"\n"}
                    {"- uses: actions/checkout@v4\n  with:\n    fetch-depth: 0\n\n"}
                    <span className="command-emphasis">{`- uses: ${site.actionRef}`}</span>
                  </code>
                </pre>
                <p>
                  No token, no install step, no API call. <code>contents: read</code> is the only
                  permission it needs, so fork pull requests behave like internal ones.
                </p>
              </div>
              <a className="text-link text-link-dark" href={repositoryUrl("docs/github-action.md")}>
                Read the Action reference <span aria-hidden="true">↗</span>
              </a>
            </div>
            <RegressionVisual />
          </div>
        </section>

        <section
          className="section how-section container"
          id="how-it-works"
          aria-labelledby="how-title"
        >
          <SectionHeader
            id="how-title"
            kicker="From native files to a reviewable answer"
            title="Compile. Compare. Protect."
            description="Harness-specific discovery stays in adapters. The shared engine keeps provenance and uncertainty intact."
            align="center"
          />

          <ol className="pipeline" aria-label="PlaybookDiff analysis pipeline">
            <li>
              <h3>Compile</h3>
              <p>Each adapter models what its harness actually receives for this launch context.</p>
              <code>EffectiveAgentConfig × 2</code>
            </li>
            <li>
              <h3>Compare</h3>
              <p>
                Normalized instructions, skills, MCP, and scope resolve to equivalent, divergent, or
                unknown.
              </p>
              <code>Findings + evidence</code>
            </li>
            <li>
              <h3>Protect</h3>
              <p>Stable IDs match findings across revisions, so review sees only what changed.</p>
              <code>CompatibilityReport</code>
            </li>
          </ol>

          <div className="command-grid" aria-label="PlaybookDiff CLI workflow">
            {commands.map((item) => (
              <article key={item.name}>
                <span>{item.name}</span>
                <pre tabIndex={0} aria-label={item.name + " command"}>
                  <code>{item.command}</code>
                </pre>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
          <p className="center-link">
            <a className="text-link" href={repositoryUrl("docs/architecture.md")}>
              Read the architecture <span aria-hidden="true">↗</span>
            </a>
          </p>
        </section>

        <section
          className="section coverage-section container"
          id="coverage"
          aria-labelledby="coverage-title"
        >
          <SectionHeader
            id="coverage-title"
            kicker="What it compares"
            title="The effective setup, not the file list."
            description="Each harness is modelled on its own discovery rules, then only normalized, evidence-backed facts are compared."
          />

          <div className="surface-table-scroll" tabIndex={0} aria-labelledby="coverage-title">
            <table className="surface-table">
              <thead>
                <tr>
                  <th scope="col">Surface</th>
                  <th scope="col">Claude Code reads</th>
                  <th scope="col">Codex reads</th>
                  <th scope="col">Compared as</th>
                </tr>
              </thead>
              <tbody>
                {surfaces.map((row) => (
                  <tr key={row.surface}>
                    <th scope="row">{row.surface}</th>
                    <td>
                      <code>{row.claude}</code>
                    </td>
                    <td>
                      <code>{row.codex}</code>
                    </td>
                    <td>{row.compared}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="caption">
            Where an agent is launched decides which of these it reaches at all, so every finding
            carries its own <code>cwd</code> and target.{" "}
            <a href={repositoryUrl("docs/comparison.md")}>Read the comparison spec ↗</a>
          </p>
        </section>

        <section
          className="section principles-section container"
          id="principles"
          aria-labelledby="principles-title"
        >
          <SectionHeader
            id="principles-title"
            kicker="Deterministic by design"
            title="A result you can audit. A boundary you can trust."
            description="PlaybookDiff is infrastructure for inspecting configuration, not an AI wrapper around another model call."
          />

          <div className="principles-layout">
            <div className="guarantee-list">
              {guarantees.map(([title, description], index) => (
                <article key={title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                  <span className="guarantee-check" aria-hidden="true">
                    ✓
                  </span>
                </article>
              ))}
            </div>

            <div className="unknown-panel">
              <div className="unknown-panel-heading">
                <Badge tone="info">Info</Badge>
                <span>semantic relationship unknown</span>
              </div>
              <blockquote>
                <p>“Run tests before pushing.”</p>
                <span aria-hidden="true">↔</span>
                <p>“Make sure the test suite passes before you push.”</p>
              </blockquote>
              <h3>Different text is a fact. Incompatibility is not.</h3>
              <p>
                The analyzer proves that the evidence is insufficient, reports an informational
                unknown, and keeps CI green.
              </p>
              <a
                className="text-link"
                href={evidenceUrl(
                  "packages/harness-codex/test/fixtures/comparison/semantic-unknown",
                  "tree",
                )}
              >
                Inspect the wording fixture <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <div className="limitations" aria-labelledby="limitations-title">
            <div className="limitations-heading">
              <Kicker>Honest boundaries</Kicker>
              <h3 id="limitations-title">What the report does not claim</h3>
            </div>
            <div className="limitations-list">
              <details>
                <summary>
                  Repository-defined is not machine-effective <span aria-hidden="true">+</span>
                </summary>
                <p>
                  User, machine, managed, trust, approval, and one-off CLI state remain outside the
                  report.
                </p>
              </details>
              <details>
                <summary>
                  Configured is not available <span aria-hidden="true">+</span>
                </summary>
                <p>
                  MCP servers and skills are compared as repository configuration, not as reachable
                  runtime capabilities.
                </p>
              </details>
              <details>
                <summary>
                  Some real harness surfaces remain unsupported <span aria-hidden="true">+</span>
                </summary>
                <p>
                  Skill bodies, legacy Claude commands, plugin skills, runtime MCP discovery, and
                  working-tree Git diffing are not modeled.
                </p>
              </details>
              <a className="text-link" href={repositoryUrl("docs/limitations.md")}>
                Read every supported surface and limitation <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>

        <section
          className="get-started-section"
          id="get-started"
          aria-labelledby="get-started-title"
        >
          <div className="container get-started-layout">
            <div>
              <Kicker tone="dark">
                MIT licensed · <code>{site.release}</code>
              </Kicker>
              <h2 id="get-started-title">Check whether your agents see the same repo.</h2>
              <p>
                Add <code>{`uses: ${site.actionRef}`}</code> to guard every pull request, or build
                the CLI from source to run one check locally and follow each finding to its
                evidence.
              </p>
              <div className="get-started-actions">
                <ButtonLink href={repositoryUrl("docs/cli.md")}>Read the CLI guide</ButtonLink>
                <ButtonLink href={site.repository} variant="ghost" external>
                  View the repository
                </ButtonLink>
              </div>
              <p className="launch-note launch-note-final">
                The CLI is not published to npm yet. Building it requires Node 24.11+ within 24.x
                and pnpm 11.24.0.
              </p>
            </div>
            <ProductFrame label="Build from source" meta="CLI · current">
              <pre
                className="install-command"
                tabIndex={0}
                aria-label="Build and run PlaybookDiff from source"
              >
                <code>
                  <span className="command-comment"># Build the CLI</span>
                  {"\n"}
                  <span className="command-prompt">$</span> git clone
                  https://github.com/JacobisEpic/playbookdiff.git{"\n"}
                  <span className="command-prompt">$</span> cd playbookdiff{"\n"}
                  <span className="command-prompt">$</span> pnpm install{"\n"}
                  <span className="command-prompt">$</span> pnpm build{"\n\n"}
                  <span className="command-comment"># Analyze a repository</span>
                  {"\n"}
                  <span className="command-prompt">$</span> node packages/cli/dist/bin.js check .
                </code>
              </pre>
            </ProductFrame>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <a className="brand-link" href="#top" aria-label="PlaybookDiff home">
            <Logo compact />
          </a>
          <p>Deterministic analysis. Explicit uncertainty.</p>
          <nav aria-label="Footer navigation">
            <a href={repositoryUrl("docs/cli.md")}>CLI</a>
            <a href={repositoryUrl("docs/github-action.md")}>Action</a>
            <a href={repositoryUrl("docs/security.md")}>Security</a>
            <a href={repositoryUrl("CONTRIBUTING.md")}>Contribute</a>
            <a href={repositoryUrl("LICENSE")}>MIT</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
