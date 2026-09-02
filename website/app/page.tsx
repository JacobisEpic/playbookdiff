/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Narrow code surfaces must remain keyboard-scrollable. */
import { ExampleReport } from "../components/example-report";
import {
  Badge,
  ButtonLink,
  Kicker,
  Logo,
  ProductFrame,
  RepoTree,
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

const actionSteps = [
  {
    title: "Work out what to look at",
    detail:
      "The repository root, plus every configuration scope the pull request's changed paths fall under.",
  },
  {
    title: "Compile both revisions",
    detail:
      "The base commit and your branch are each modelled for Claude Code and for Codex, from a detached read of the Git objects.",
  },
  {
    title: "Match findings by stable ID",
    detail:
      "Findings carry an identity derived from what they mean, so a moved file is still the same finding.",
  },
  {
    title: "Fail on what is new",
    detail:
      "A new medium or high finding fails the job. Pre-existing debt and resolved findings never do.",
  },
];

const guarantees = [
  ["No model calls", "Repository content never leaves for inference."],
  ["Read-only", "Analysis never edits the repository it checks."],
  ["No project execution", "No scripts, skills, binaries, or repository hooks run."],
  ["Secrets stay unresolved", "Values remain symbolic or redacted in output."],
  ["Unknown beats guessed", "Unprovable relationships stay informational."],
];

function HeroTree() {
  const report = examples.root;

  return (
    <figure className="hero-figure">
      <ProductFrame
        className="hero-product-frame"
        label={`playbookdiff check . --path ${examples.target}`}
        meta="from the repository root"
      >
        <RepoTree
          root={examples.tree.root}
          nodes={examples.tree.nodes}
          unreached={report.unreached}
        />
        <div className="hero-verdict">
          <div>
            <span>Claude Code ends up with</span>
            <strong>{receiptSummary(report.claude)}</strong>
          </div>
          <div>
            <span>Codex ends up with</span>
            <strong>{receiptSummary(report.codex)}</strong>
          </div>
          <Badge tone="warm">{report.count} medium findings</Badge>
        </div>
      </ProductFrame>
      <figcaption>
        Every file above exists in the repository. Codex simply never walks into{" "}
        <code>apps/api</code> from here.
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
              <span className="status-dot" /> Open source · MIT · no model calls
            </Kicker>
            <h1 id="hero-title">
              Same repo.
              <br />
              Different agents.
              <br />
              <span>Know the difference.</span>
            </h1>
            <p className="hero-lead">
              Claude Code reads <code>CLAUDE.md</code>. Codex reads <code>AGENTS.md</code>. Nothing
              keeps the two in step, so your teammates&rsquo; agents quietly follow different rules.
            </p>
            <p className="hero-lead hero-lead-second">
              PlaybookDiff reads both, shows you exactly what each agent ends up with, and fails a
              pull request that opens a new gap.
            </p>
            <div className="hero-actions">
              <ButtonLink href="#demo">See it on a real repo</ButtonLink>
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
          <HeroTree />
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
            kicker="Try it"
            title={
              <>
                Where you start
                <br />
                changes what they see.
              </>
            }
            description="Both agents are pointed at the same file. Move the launch directory and Codex&rsquo;s reach changes with it."
          />
          <ExampleReport />
          <p className="caption">
            These numbers are the assertions in{" "}
            <a href={evidenceUrl(examples.source)}>a checked-in test ↗</a>, not a mock-up. Nothing
            here reads your repository; the page ships the answers with it.
          </p>
        </section>

        <section className="ci-section" id="ci" aria-labelledby="ci-title">
          <div className="container">
            <div className="ci-head">
              <Kicker tone="dark">The GitHub Action</Kicker>
              <h2 id="ci-title">Catch the gap in the pull request that opens it.</h2>
              <p>
                Two lines in a workflow. The Action re-runs the whole comparison on the base commit
                and on your branch, then compares the two reports. Divergence you already had stays
                out of the way; a gap this change introduces fails the job.
              </p>
            </div>

            <div className="ci-grid">
              <ol className="ci-steps" aria-label="What the Action does on a pull request">
                {actionSteps.map((step, index) => (
                  <li key={step.title}>
                    <span className="ci-step-index" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="ci-side">
                <div className="action-usage">
                  <span className="action-usage-label">
                    <span className="status-dot status-dot-success" /> Released as{" "}
                    <code>{site.release}</code>
                  </span>
                  <pre tabIndex={0} aria-label="GitHub Actions workflow using PlaybookDiff">
                    <code>
                      <span className="command-comment"># .github/workflows/playbookdiff.yml</span>
                      {"\n"}
                      {"on: pull_request\n\n"}
                      {"permissions:\n"}
                      {"  contents: read\n\n"}
                      {"steps:\n"}
                      {"  - uses: actions/checkout@v4\n"}
                      {"    with:\n"}
                      {"      fetch-depth: 0\n\n"}
                      {"  "}
                      <span className="command-emphasis">{`- uses: ${site.actionRef}`}</span>
                    </code>
                  </pre>
                  <p>
                    No token, no install step, no API call. It needs <code>contents: read</code> and
                    nothing else, so pull requests from forks behave exactly like internal ones.
                  </p>
                </div>

                <dl className="action-outputs">
                  <div>
                    <dt>
                      <code>result</code>
                    </dt>
                    <dd>
                      <code>no-new-regressions</code> or <code>new-regressions</code>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <code>introduced-actionable-count</code>
                    </dt>
                    <dd>New medium and high findings. This number alone decides pass or fail.</dd>
                  </div>
                  <div>
                    <dt>
                      <code>analyzed-target-count</code>
                    </dt>
                    <dd>
                      How many scopes were covered: the repository root, plus the configuration
                      scopes the changed paths sit under.
                    </dd>
                  </div>
                </dl>
                <a
                  className="text-link text-link-dark"
                  href={repositoryUrl("docs/github-action.md")}
                >
                  Every input, output, and exit code <span aria-hidden="true">↗</span>
                </a>
              </div>
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
            kicker="How it works"
            title="Compile. Compare. Protect."
            description="Each agent&rsquo;s discovery rules live in its own adapter. The shared engine only ever compares facts it can point at."
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
            title="What actually gets compared."
            description="Not a text diff of two Markdown files. Each side is resolved to what the agent effectively receives, then normalized and compared."
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
            Every finding records the launch directory and target it came from.{" "}
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
            kicker="What it will not do"
            title="No guessing, anywhere."
            description="Every finding points at a file. Anything the evidence cannot settle is reported as unknown instead of asserted."
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
              <h3>Different words are a fact. A conflict is not.</h3>
              <p>
                Two sentences that read the same to you are still two different strings.
                PlaybookDiff says so, marks it unknown, and leaves your build green.
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
              <Kicker>Scope</Kicker>
              <h3 id="limitations-title">What it deliberately will not tell you</h3>
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
              <h2 id="get-started-title">Find out what your repo actually tells each agent.</h2>
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
          <p>Read-only. Deterministic. No model calls.</p>
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
