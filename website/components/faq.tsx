import type { ReactNode } from "react";

/**
 * The FAQ exists to remove specific misconceptions, not to fill the page.
 *
 * Every answer is short and points at the first-party document that carries
 * the detail. Native `<details>` keeps it keyboard-operable, readable with
 * JavaScript disabled, and free of any interaction the browser does not
 * already provide.
 */

const questions: { question: string; answer: ReactNode }[] = [
  {
    question: "Why can't I just keep CLAUDE.md and AGENTS.md identical?",
    answer: (
      <>
        <p>
          Identical files do not guarantee identical configuration, because the two harnesses do not
          discover files the same way. They read different filenames, build their nested instruction
          chains from different starting points, support different import and settings conventions,
          and look for skills in different directories. The example above is one real case: every
          file exists on both sides, and one agent still never receives two of them.
        </p>
        <p>
          Keeping the files in step is worth doing. It is just not the same thing as proving the
          configuration is in step. <a href="/docs/limitations">Scope and limitations</a> lists what
          is modelled on each side.
        </p>
      </>
    ),
  },
  {
    question: "Does PlaybookDiff run Claude Code or Codex?",
    answer: (
      <p>
        No. It models the documented, fixture-tested discovery rules of each harness and compiles
        the repository configuration each one would receive for a given launch directory and work
        target. The rules it models, and the official documentation behind them, are written down in
        the <a href="/docs/harnesses/claude">Claude Code</a> and{" "}
        <a href="/docs/harnesses/codex">Codex</a> harness specifications.
      </p>
    ),
  },
  {
    question: "Does it send my repository anywhere?",
    answer: (
      <>
        <p>
          No. There is no PlaybookDiff service to upload anything to, and the analysis never opens a
          connection at all: no GitHub API, no Git fetch, no MCP connection. Nothing from the
          repository leaves the machine.
        </p>
        <p>
          Secrets are never resolved. <code>${"{VAR}"}</code> stays symbolic, a configured literal
          appears only as redacted with its variable name, and MCP evidence is limited to structural
          facts. The <a href="/docs/security">security model</a> states each property and how it is
          enforced.
        </p>
      </>
    ),
  },
  {
    question: "If the configuration matches, will the two agents behave the same?",
    answer: (
      <p>
        No, and PlaybookDiff never claims that. It compares supported configuration surfaces:
        instructions, skills, and MCP server definitions. Two agents given the same instructions can
        still do different things, and the report says only that no deterministic configuration
        difference was proven. Even the Action&rsquo;s result deliberately says{" "}
        <code>no-new-regressions</code> rather than &ldquo;compatible&rdquo;.
      </p>
    ),
  },
  {
    question: "What happens when it is not sure?",
    answer: (
      <p>
        It says so. A result is <em>equivalent</em> when a deterministic rule matches,{" "}
        <em>divergent</em> when a structural difference is proven from repository evidence, and{" "}
        <em>unknown</em> when the available evidence cannot decide without guessing. Differently
        worded prose is the common unknown: PlaybookDiff can prove two instruction bodies differ,
        not that they conflict. Unknowns are informational and never fail CI.{" "}
        <a href="/docs/comparison">The comparison specification</a> has the rules.
      </p>
    ),
  },
  {
    question: "Which agents are supported?",
    answer: (
      <p>
        Claude Code and Codex. Those are the two harnesses with adapters, fixtures, and written
        specifications, and the tool does not pretend to cover others. Additional harnesses are out
        of the current release scope.
      </p>
    ),
  },
];

export function Faq() {
  return (
    <div className="faq">
      {questions.map(({ question, answer }) => (
        <details key={question}>
          <summary>
            {question}
            <span className="faq-marker" aria-hidden="true" />
          </summary>
          <div className="faq-answer">{answer}</div>
        </details>
      ))}
    </div>
  );
}
