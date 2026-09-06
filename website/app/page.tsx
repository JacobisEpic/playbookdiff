/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Narrow code surfaces must remain keyboard-scrollable. */
import { ExampleReport } from "../components/example-report";
import { Ledger, type LedgerRow } from "../components/ledger";
import { ButtonLink, Command, Logo } from "../components/site-ui";
import examples from "../lib/examples.json";
import { evidenceUrl, repositoryUrl, site, walkthrough } from "../lib/site";

// The hero ledger describes an illustrative repository rather than the
// checked-in fixture, and the caption beneath it says so. The fixture-backed
// example lower down carries the evidence.
const heroRows: LedgerRow[] = [
  { id: "instruction", group: "Instructions", left: "CLAUDE.md", right: "AGENTS.md" },
  { id: "mcp", group: "MCP servers", left: ".mcp.json", right: ".codex/config.toml" },
  {
    id: "review",
    group: "Skills",
    left: ".claude/skills/review/",
    right: ".agents/skills/review/",
  },
  { id: "deploy", group: "Skills", left: ".claude/skills/deploy/", right: null },
];

const surfaces = [
  {
    term: "Instructions",
    detail: (
      <>
        <code>CLAUDE.md</code>, <code>AGENTS.md</code>, nested instructions, imports, and effective
        scope.
      </>
    ),
  },
  {
    term: "Skills",
    detail: (
      <>
        <code>.claude/skills/</code> and <code>.agents/skills/</code>, discovery state and
        invocation policy.
      </>
    ),
  },
  {
    term: "MCP servers",
    detail: (
      <>
        <code>.mcp.json</code> and <code>.codex/config.toml</code> transport, command, and
        arguments.
      </>
    ),
  },
];

const guarantees = [
  ["Read-only", "Never edits the repository it checks."],
  ["No execution", "Never runs scripts, skills, binaries, hooks, or MCP servers."],
  ["No model calls", "Deterministic comparison. No network, no API key."],
  ["Unknown beats guessed", "Different wording is never reported as a conflict."],
];

function Walkthrough() {
  return (
    <section className="section walkthrough" id="walkthrough" aria-labelledby="walkthrough-title">
      <div className="container walkthrough-layout">
        <div>
          <h2 id="walkthrough-title">Watch a full check.</h2>
          <p>A recorded end-to-end run, from a clean checkout to a failing pull request.</p>
        </div>
        {walkthrough.src ? (
          <video
            className="walkthrough-frame"
            controls
            preload="metadata"
            poster={walkthrough.poster ?? undefined}
          >
            <source src={walkthrough.src} type="video/mp4" />
            <track
              kind="captions"
              srcLang="en"
              label="English"
              src={walkthrough.captions}
              default
            />
          </video>
        ) : (
          <div className="walkthrough-frame walkthrough-pending">
            <p>Recording in progress</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="site-header" id="top">
        <div className="container header-inner">
          <a className="brand-link" href="#top" aria-label="PlaybookDiff home">
            <Logo />
          </a>
          <nav aria-label="Main navigation">
            <a href={repositoryUrl("docs/cli.md")}>
              Docs <span aria-hidden="true">↗</span>
            </a>
            <a href={site.repository}>
              GitHub <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="hero-meta">
              <span>Open source</span>
              <span>{site.release}</span>
              <span>CLI and GitHub Action</span>
            </p>
            <h1 id="hero-title">
              Keep Claude Code and <span className="mark-codex">Codex</span> in sync.
            </h1>
            <p className="hero-lead">
              PlaybookDiff checks the instructions, skills, and MCP configuration each coding agent
              actually receives, and catches differences before they land.
            </p>
            <Command label="Check a repository with PlaybookDiff">playbookdiff check .</Command>
            <div className="hero-actions">
              <ButtonLink href={repositoryUrl("docs/cli.md")}>Get started</ButtonLink>
              <ButtonLink href={site.repository} variant="ghost" external>
                View on GitHub
              </ButtonLink>
            </div>
          </div>

          <figure className="hero-figure">
            <Ledger
              command="playbookdiff check ."
              meta="what each agent receives"
              rows={heroRows}
              findings={[{ id: "gap", severity: "medium", title: "Skill capability gap" }]}
              animate
            />
            <figcaption>
              An illustrative repository. The example below is pinned to a checked-in fixture.
            </figcaption>
          </figure>
        </section>

        <section className="section container" id="surfaces" aria-labelledby="surfaces-title">
          <div className="prose">
            <h2 id="surfaces-title">Matching files are not matching configuration.</h2>
            <p>
              Claude Code and Codex read <code>CLAUDE.md</code> and <code>AGENTS.md</code> under
              different discovery rules, nested scopes, imports, and skill conventions. Two files
              can look parallel and still produce different effective configuration. PlaybookDiff
              compiles what each agent receives across three surfaces, then compares those.
            </p>
          </div>

          <dl className="surfaces">
            {surfaces.map((surface) => (
              <div key={surface.term}>
                <dt>{surface.term}</dt>
                <dd>{surface.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="section container" id="example" aria-labelledby="example-title">
          <div className="prose">
            <h2 id="example-title">Every file exists. One agent still never sees it.</h2>
            <p>
              This repository has matching root and <code>apps/api</code> instructions and skills
              for both agents, and an agent working on <code>{examples.target}</code>. Only the
              launch directory changes.
            </p>
          </div>

          <ExampleReport />

          <p className="footnote">
            Reproduced from the{" "}
            <a href={evidenceUrl(examples.fixture, "tree")}>checked-in fixture</a> by a{" "}
            <a href={evidenceUrl(examples.source)}>test that asserts both results</a>.
          </p>
        </section>

        <Walkthrough />

        <section className="section container" id="run" aria-labelledby="run-title">
          <div className="prose">
            <h2 id="run-title">Run it locally, then keep it there.</h2>
          </div>

          <div className="run">
            <article>
              <h3>Locally</h3>
              <Command label="Check a repository from the terminal">playbookdiff check .</Command>
              <p>
                Prints every proven configuration gap, with the source file behind each one. Exits
                non-zero on actionable findings.
              </p>
            </article>
            <article>
              <h3>In CI</h3>
              <pre tabIndex={0} aria-label="Use PlaybookDiff in GitHub Actions">
                <code>{`uses: ${site.actionRef}`}</code>
              </pre>
              <p>
                Compares the pull request base against the head and fails only on newly introduced
                findings. Existing debt stays green.
              </p>
            </article>
          </div>
        </section>

        <section className="section container closing" aria-labelledby="closing-title">
          <div className="prose">
            <h2 id="closing-title">It reports what it can prove.</h2>
          </div>

          <dl className="guarantees">
            {guarantees.map(([term, detail]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>

          <div className="closing-actions">
            <ButtonLink href={site.repository} external>
              View on GitHub
            </ButtonLink>
            <ButtonLink href={repositoryUrl("docs/cli.md")} variant="ghost">
              Read the docs
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <a className="brand-link" href="#top" aria-label="PlaybookDiff home">
            <Logo />
          </a>
          <nav aria-label="Footer navigation">
            <a href={repositoryUrl("docs/cli.md")}>CLI</a>
            <a href={repositoryUrl("docs/github-action.md")}>Action</a>
            <a href={repositoryUrl("docs/security.md")}>Security</a>
            <a href={repositoryUrl("docs/limitations.md")}>Limitations</a>
            <a href={repositoryUrl("CONTRIBUTING.md")}>Contribute</a>
            <a href={repositoryUrl("LICENSE")}>MIT</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
