/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Narrow code surfaces must remain keyboard-scrollable. */
import { EffectiveScope } from "../components/effective-scope";
import { Faq } from "../components/faq";
import { AgentMark, ButtonLink, Command, SiteFooter, SiteHeader } from "../components/site-ui";
import example from "../lib/effective-scope.json";
import { evidenceUrl, site } from "../lib/site";

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

      <SiteHeader home />

      <main id="main">
        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">Keep Claude Code and Codex in sync.</h1>
            <p className="hero-lead">
              PlaybookDiff checks the instructions, skills, and MCP configuration each coding agent
              effectively receives, and catches differences before they land.
            </p>
            <Command label="Install PlaybookDiff and check a repository">
              {`npm install -g ${site.npmPackage}\nplaybookdiff check .`}
            </Command>
            <div className="hero-actions">
              <ButtonLink href="/docs/cli">Read the docs</ButtonLink>
              <ButtonLink href={site.repository} variant="ghost" external>
                View on GitHub
              </ButtonLink>
            </div>
          </div>

          <img
            className="hero-mark"
            src="/brand/mascots-reading.png"
            alt=""
            width="364"
            height="297"
          />
        </section>

        <section className="section container" id="example" aria-labelledby="example-title">
          <div className="prose">
            <h2 id="example-title">Matching files are not matching configuration.</h2>
            <p>
              Both agents have a root instruction and a root skill, and matching ones again under{" "}
              <code>apps/api</code>. The files are all present and their contents match. Claude Code
              and Codex still discover them under different rules, so the configuration each one
              receives depends on where its session started.
            </p>
          </div>

          <EffectiveScope />

          <p className="footnote">
            Generated from <a href={evidenceUrl(example.fixture, "tree")}>the checked-in fixture</a>{" "}
            by running the real analyzer, and protected by{" "}
            <a href={evidenceUrl(example.test)}>a test that asserts both results</a>. The discovery
            rules behind it are specified for <a href="/docs/harnesses/claude">Claude Code</a> and{" "}
            <a href="/docs/harnesses/codex">Codex</a>, each citing that harness&rsquo;s official
            documentation.
          </p>
        </section>

        <section className="section container" id="surfaces" aria-labelledby="surfaces-title">
          <div className="prose">
            <h2 id="surfaces-title">What it compares.</h2>
            <p>
              PlaybookDiff compiles what each harness effectively receives across three surfaces,
              then compares those instead of the files.
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

          <p className="footnote">
            <a href="/docs/limitations">
              The full supported-semantics matrix <span aria-hidden="true">→</span>
            </a>
          </p>
        </section>

        <section className="section container" id="run" aria-labelledby="run-title">
          <div className="prose">
            <h2 id="run-title">Run it locally, then keep it there.</h2>
          </div>

          <div className="run">
            <article>
              <h3>On your machine</h3>
              <Command label="Install PlaybookDiff and check a repository">
                {`npm install -g ${site.npmPackage}\nplaybookdiff check .`}
              </Command>
              <p>
                Prints every proven configuration gap, with the source file behind each one, and
                exits non-zero on actionable findings. <code>explain</code> expands one finding and{" "}
                <code>diff</code> compares two Git revisions. <a href="/docs/cli">CLI reference</a>.
              </p>
            </article>
            <article>
              <h3>In pull requests</h3>
              <pre tabIndex={0} aria-label="Use PlaybookDiff in GitHub Actions">
                <code>{`- uses: actions/checkout@v4\n    with:\n      fetch-depth: 0\n\n- uses: ${site.actionRef}`}</code>
              </pre>
              <p>
                The Action compares the pull request base against the head and fails only on newly
                introduced findings, so existing debt stays green. It needs{" "}
                <code>contents: read</code> and no token.{" "}
                <a href="/docs/action">Action reference</a>.
              </p>
            </article>
          </div>

          <p className="footnote">
            Prefer to build from source, or read it first?{" "}
            <a href={site.repository}>
              The repository <span aria-hidden="true">↗</span>
            </a>
          </p>
        </section>

        <section className="section container" id="trust" aria-labelledby="trust-title">
          <div className="prose">
            <h2 id="trust-title">It reports what it can prove.</h2>
          </div>

          <dl className="guarantees">
            {guarantees.map(([term, detail]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>

          <p className="footnote">
            <a href="/docs/security">
              How each of these is enforced, and tested <span aria-hidden="true">→</span>
            </a>
          </p>
        </section>

        <section className="section container" id="faq" aria-labelledby="faq-title">
          <div className="prose">
            <h2 id="faq-title">Questions people ask first.</h2>
          </div>
          <Faq />

          <p className="footnote">
            Anything else is in <a href="/docs">the documentation</a>, or worth{" "}
            <a href={`${site.repository}/issues`}>
              opening an issue <span aria-hidden="true">↗</span>
            </a>
            .
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
