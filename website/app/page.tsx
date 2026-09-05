/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Narrow code surfaces must remain keyboard-scrollable. */
import { ExampleReport } from "../components/example-report";
import { Badge, ButtonLink, Logo, ProductFrame } from "../components/site-ui";
import examples from "../lib/examples.json";
import { evidenceUrl, repositoryUrl, site } from "../lib/site";

const surfaces = [
  {
    index: "01",
    title: "Instructions",
    detail: "CLAUDE.md, AGENTS.md, nested rules, imports, and scope.",
  },
  {
    index: "02",
    title: "Skills",
    detail: ".claude/skills/ and .agents/skills/, including discovery and invocation policy.",
  },
  {
    index: "03",
    title: "MCP servers",
    detail: ".mcp.json and .codex/config.toml transport and command configuration.",
  },
];

const principles = [
  ["Read-only", "Never edits the repository it checks."],
  ["No project execution", "Never runs scripts, skills, binaries, hooks, or MCP servers."],
  ["Secrets stay unresolved", "Values remain symbolic or redacted."],
  ["Unknown beats guessed", "Different wording is not treated as a semantic conflict."],
];

function HeroRegression() {
  return (
    <figure className="hero-regression">
      <ProductFrame
        className="regression-frame"
        label={
          <span className="frame-label">
            <span className="pull-icon" aria-hidden="true">
              ⑂
            </span>
            Pull request check
          </span>
        }
        meta={<span className="ci-fail-label">CI fails</span>}
      >
        <div className="change-block">
          <span>This pull request adds</span>
          <code>
            <b aria-hidden="true">+</b> .claude/skills/deploy/SKILL.md
          </code>
        </div>

        <div className="agent-comparison" aria-label="What each agent receives">
          <span className="comparison-label">What each agent receives</span>
          <div className="agent-result agent-result-claude">
            <span className="agent-symbol" aria-hidden="true">
              <img src="/brand/claude_logo.png" alt="" width="1254" height="1254" />
            </span>
            <strong>Claude Code</strong>
            <span className="result-value result-present">
              <i aria-hidden="true">✓</i> deploy skill
            </span>
          </div>
          <div className="agent-result agent-result-codex">
            <span className="agent-symbol" aria-hidden="true">
              <img src="/brand/codex_logo.png" alt="" width="1254" height="1254" />
            </span>
            <strong>Codex</strong>
            <span className="result-value result-missing">
              <i aria-hidden="true">×</i> no corresponding skill
            </span>
          </div>
        </div>

        <div className="regression-result">
          <span>Result</span>
          <div>
            <Badge tone="warm">Medium</Badge>
            <strong>Skill capability gap</strong>
            <span className="ci-fail-label">CI fails</span>
          </div>
        </div>
      </ProductFrame>
      <figcaption>
        The basic case: one agent gets a new capability and the other does not.
      </figcaption>
    </figure>
  );
}

function WorkflowBand() {
  return (
    <div className="workflow-band" id="workflow">
      <h3>
        Catch <span>drift</span> while you work.
      </h3>
      <div className="workflow-paths">
        <article>
          <span className="workflow-heading">
            <i aria-hidden="true">›_</i> Check locally
          </span>
          <pre tabIndex={0} aria-label="Run PlaybookDiff locally">
            <code>
              <span>$</span> playbookdiff check .
            </code>
          </pre>
          <p>See every proven configuration gap and the files that caused it.</p>
        </article>
        <article>
          <span className="workflow-heading">
            <i aria-hidden="true">⑂</i> Protect pull requests
          </span>
          <pre tabIndex={0} aria-label="Use PlaybookDiff in GitHub Actions">
            <code>{`uses: ${site.actionRef}`}</code>
          </pre>
          <p>
            Fail only when a change introduces a new actionable regression. Existing debt stays
            green.
          </p>
        </article>
      </div>
    </div>
  );
}

function EvidencePanel() {
  return (
    <ProductFrame className="evidence-panel" label="Example finding" meta="Evidence attached">
      <div className="evidence-title">
        <Badge tone="warm">Medium</Badge>
        <strong>Skill capability gap</strong>
      </div>
      <div className="evidence-path evidence-path-present">
        <span aria-hidden="true">✓</span>
        <code>.claude/skills/deploy/SKILL.md</code>
      </div>
      <div className="evidence-path evidence-path-missing">
        <span aria-hidden="true">×</span>
        <code>.agents/skills/deploy/SKILL.md</code>
        <em>not found</em>
      </div>
      <a className="evidence-link" href={repositoryUrl("docs/comparison.md")}>
        How findings carry source evidence <span aria-hidden="true">↗</span>
      </a>
    </ProductFrame>
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
              <a className="nav-optional" href="#checks">
                What it checks
              </a>
              <a className="nav-optional" href="#workflow">
                CI
              </a>
              <a className="nav-optional" href="#demo">
                Demo
              </a>
              <a className="nav-optional" href="#discovery">
                Why it works
              </a>
              <a className="nav-optional" href={repositoryUrl("docs/cli.md")}>
                Docs <span aria-hidden="true">↗</span>
              </a>
              <a className="nav-cta" href={site.repository}>
                <span className="nav-cta-text">View on GitHub</span>
                <span aria-hidden="true">↗</span>
              </a>
            </nav>
          </div>
        </header>

        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="hero-eyebrow">
              <span>Open-source analyzer</span>
              <span aria-hidden="true">/</span>
              {site.release}
            </p>
            <h1 id="hero-title">
              Keep Claude Code and <span>Codex</span> in sync.
            </h1>
            <p className="hero-lead">
              PlaybookDiff checks what each agent actually receives and catches configuration gaps
              before they land.
            </p>
            <div className="hero-actions">
              <ButtonLink href="#simple-example">See an example</ButtonLink>
              <ButtonLink href={site.repository} variant="ghost" external>
                View on GitHub
              </ButtonLink>
            </div>
            <ul className="hero-trust" aria-label="Project principles">
              <li>Read-only</li>
              <li>Deterministic</li>
              <li>No model calls</li>
            </ul>
          </div>
          <div id="simple-example">
            <HeroRegression />
          </div>
        </section>
      </div>

      <main id="main">
        <section
          className="section checks-section container"
          id="checks"
          aria-labelledby="checks-title"
        >
          <div className="section-intro">
            <h2 id="checks-title">
              More than a <code>CLAUDE.md</code> <span>↔</span> <code>AGENTS.md</code> diff.
            </h2>
            <p>Matching files do not guarantee matching effective configuration.</p>
          </div>

          <ol className="surface-rail" aria-label="Configuration surfaces PlaybookDiff checks">
            {surfaces.map((surface) => (
              <li key={surface.title}>
                <span>{surface.index}</span>
                <h3>{surface.title}</h3>
                <p>{surface.detail}</p>
              </li>
            ))}
          </ol>

          <WorkflowBand />
        </section>

        <section className="demo-video-section" id="demo" aria-labelledby="demo-video-title">
          <div className="container demo-video-layout">
            <div className="demo-video-copy">
              <p className="section-kicker">Walkthrough / Film 01</p>
              <h2 id="demo-video-title">See the whole check in under two minutes.</h2>
              <p>
                A guided product tour is in production. This frame is reserved for the final demo
                and sized for a 16:9 video.
              </p>
            </div>
            <div className="demo-video-frame" data-demo-video-slot>
              <div className="demo-video-chrome" aria-hidden="true">
                <span>PLAYBOOKDIFF_DEMO_01</span>
                <span>01:30</span>
              </div>
              <div className="demo-video-placeholder">
                <span className="demo-video-play" aria-hidden="true">
                  <i />
                </span>
                <div>
                  <strong>Product walkthrough</strong>
                  <span>Film in production</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="section discovery-section"
          id="discovery"
          aria-labelledby="discovery-title"
        >
          <div className="container">
            <div className="discovery-intro">
              <h2 id="discovery-title">
                Sometimes both files exist, and that is <span>still</span> not enough.
              </h2>
              <p>
                Claude Code and Codex use different discovery rules. Where an agent starts can
                change what it receives.
              </p>
            </div>

            <ExampleReport />
            <p className="demo-caption">
              Every file exists. Codex never walks into <code>apps/api</code> from the repository
              root. The example is pinned to assertions in a{" "}
              <a href={evidenceUrl(examples.source)}>checked-in test</a>.
            </p>
          </div>
        </section>

        <section
          className="section evidence-section container"
          id="evidence"
          aria-labelledby="evidence-title"
        >
          <div className="evidence-layout">
            <div>
              <div className="section-intro evidence-intro">
                <h2 id="evidence-title">
                  Evidence, <span>not</span> guesses.
                </h2>
                <p>
                  PlaybookDiff is read-only and deterministic. When it can prove a configuration
                  difference, it reports the source. When it cannot, it says unknown.
                </p>
              </div>

              <ol className="principle-list">
                {principles.map(([title, detail], index) => (
                  <li key={title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <EvidencePanel />
          </div>
        </section>

        <section className="closing-section" aria-labelledby="closing-title">
          <div className="container closing-inner">
            <div>
              <h2 id="closing-title">Keep both agents on the same playbook.</h2>
              <p>
                Add the GitHub Action to protect pull requests, or inspect a repository locally.
              </p>
            </div>
            <div className="closing-actions">
              <ButtonLink href={repositoryUrl("docs/cli.md")}>Read the docs</ButtonLink>
              <ButtonLink href={site.repository} variant="ghost" external>
                View on GitHub
              </ButtonLink>
              <span>Open source · MIT</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <a className="brand-link" href="#top" aria-label="PlaybookDiff home">
            <Logo compact inverse />
          </a>
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
