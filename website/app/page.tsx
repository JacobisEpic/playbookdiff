/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Narrow code surfaces must remain keyboard-scrollable. */
import { ExampleReport } from "../components/example-report";
import { Ledger, type LedgerRow } from "../components/ledger";
import { AgentMark, ButtonLink, Command, Logo } from "../components/site-ui";
import examples from "../lib/examples.json";
import { evidenceUrl, repositoryUrl, site } from "../lib/site";

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

// The three compared surfaces, as a specification rather than a feature grid:
// what each harness actually reads, and what the comparator decides from it.
const surfaces = [
  {
    surface: "Instructions",
    compared: "Content, scope, and load phase.",
    claude: ["CLAUDE.md", ".claude/CLAUDE.md", "imports", "nested instructions"],
    codex: ["AGENTS.md", "AGENTS.override.md", "fallback names", "nested chain"],
  },
  {
    surface: "Skills",
    compared: "Discovery, invocation policy, and description.",
    claude: [".claude/skills/*/SKILL.md"],
    codex: [".agents/skills/*/SKILL.md", "agents/openai.yaml"],
  },
  {
    surface: "MCP servers",
    compared: "Transport, command, arguments, and environment.",
    claude: [".mcp.json"],
    codex: ["mcp_servers in .codex/config.toml"],
  },
];

const guarantees = [
  ["Read-only", "Never edits the repository it checks."],
  ["No execution", "Never runs scripts, skills, binaries, hooks, or MCP servers."],
  ["No model calls", "Deterministic comparison. No network, no API key."],
  ["Unknown beats guessed", "Different wording is never reported as a conflict."],
];

function SurfaceCell({ items }: { items: string[] }) {
  return (
    <ul className="surface-list">
      {items.map((item) => (
        <li key={item}>
          <code>{item}</code>
        </li>
      ))}
    </ul>
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
            <h1 id="hero-title">Keep Claude Code and Codex in sync.</h1>
            <p className="hero-lead">
              PlaybookDiff checks the instructions, skills, and MCP configuration each coding agent
              actually receives, and catches differences before they land.
            </p>
            <Command label="Check a repository with PlaybookDiff">playbookdiff check .</Command>
            <div className="hero-actions">
              <ButtonLink href={repositoryUrl("docs/cli.md")}>Get the CLI</ButtonLink>
              <ButtonLink href={site.repository} variant="ghost" external>
                View on GitHub
              </ButtonLink>
            </div>
          </div>

          <figure className="hero-figure">
            <Ledger
              command="playbookdiff check ."
              meta="1 finding"
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
              The two harnesses discover configuration under different rules, scopes, imports, and
              conventions. PlaybookDiff compiles what each one effectively receives across three
              surfaces, then compares those instead of the files.
            </p>
          </div>

          <table className="surfaces">
            <thead>
              <tr>
                <th scope="col">Surface</th>
                <th scope="col">
                  <AgentMark agent="claude" name="Claude Code" />
                </th>
                <th scope="col">
                  <AgentMark agent="codex" name="Codex" />
                </th>
              </tr>
            </thead>
            <tbody>
              {surfaces.map((row) => (
                <tr key={row.surface}>
                  <th scope="row">
                    {row.surface}
                    <span>{row.compared}</span>
                  </th>
                  <td data-agent="Claude Code">
                    <SurfaceCell items={row.claude} />
                  </td>
                  <td data-agent="Codex">
                    <SurfaceCell items={row.codex} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="section container" id="run" aria-labelledby="run-title">
          <div className="prose">
            <h2 id="run-title">Run it locally, then keep it there.</h2>
          </div>

          <div className="run">
            <article>
              <h3>On your machine</h3>
              <Command label="Check a repository from the terminal">playbookdiff check .</Command>
              <p>
                Prints every proven configuration gap, with the source file behind each one. Exits
                non-zero on actionable findings. Not on npm yet, so{" "}
                <a href={repositoryUrl("docs/cli.md")}>build the CLI from source</a>.
              </p>
            </article>
            <article>
              <h3>In pull requests</h3>
              <pre tabIndex={0} aria-label="Use PlaybookDiff in GitHub Actions">
                <code>{`uses: ${site.actionRef}`}</code>
              </pre>
              <p>
                The released GitHub Action compares the pull request base against the head and fails
                only on newly introduced findings. Existing debt stays green.
              </p>
            </article>
          </div>
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

        <section className="section container closing" aria-labelledby="closing-title">
          <div className="closing-layout">
            <div>
              <h2 id="closing-title">It reports what it can prove.</h2>

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
                <ButtonLink href={repositoryUrl("docs/limitations.md")} variant="ghost">
                  Read the limitations
                </ButtonLink>
              </div>
            </div>

            <img
              className="closing-mark"
              src="/brand/mascots-reading.png"
              alt=""
              width="364"
              height="297"
            />
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
          </nav>
          <p className="footer-meta">
            <a href={`${site.repository}/releases/tag/${site.release}`}>{site.release}</a>
            <a href={repositoryUrl("LICENSE")}>MIT</a>
          </p>
        </div>
      </footer>
    </>
  );
}
