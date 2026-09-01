# PlaybookDiff

> Make sure Claude Code and Codex are working from the same playbook.

PlaybookDiff is a read-only compatibility checker for repositories that configure more than one coding agent.
It compiles the instructions, skills, and MCP servers that Claude Code and Codex each actually receive, compares them deterministically, and explains where they diverge.

It never modifies the repository it analyzes, never runs anything from it, and never claims the two agents will behave the same.

## Why it exists

Repositories increasingly carry configuration for several agents at once - `CLAUDE.md` beside `AGENTS.md`, `.claude/rules/`, `.claude/skills/` beside `.agents/skills/`, `.mcp.json` beside `.codex/config.toml`.

Nothing keeps them in sync.
The two harnesses discover configuration by different rules, so files that look parallel in a directory listing are often not parallel in effect, and a change that updates one side and forgets the other produces no error anywhere.
The drift is only visible when an agent behaves differently from the one your teammate is using.

PlaybookDiff makes that difference explicit, and fails CI when a pull request introduces a new one.

## What it catches

Concrete examples, all of which are ordinary and none of which any existing tool reports:

- A `CLAUDE.md` carrying real guidance, next to an `AGENTS.md` that only says "see CLAUDE.md" - a path mentioned in prose is not an import, so one agent gets the guidance and the other gets a sentence.
- A new `packages/api/CLAUDE.md` with no Codex counterpart, so the two agents work from different rules inside that package.
- A skill whose frontmatter blocks user invocation in one harness using a field the other does not recognize, leaving it invokable there.
- An MCP server defined for one agent and not the other, or defined for both with different arguments.
- A path-scoped rule that applies to `**/*_test.go` in one harness and has no counterpart in the other.

Here is what a finding looks like:

```text
MEDIUM  Instruction missing
        Claude Code has 112 instruction content units for this effective scope that Codex
        does not receive. Both sides also have differing prose here, but that difference can
        only account for part of the gap, so this coverage is deterministically one-sided.
        Semantic equivalence of the remaining text has not been evaluated.
        Evidence:
          - Claude Code instruction with unmatched content: CLAUDE.md:1-463 (repository)
            "# CLAUDE.md

            This file provides guidance to Claude Code when working with code in this…"
        ID: instruction:missing:right:coverage-appliesto-excludedfrom-loadphase-startu:ef872bca
```

## Install

PlaybookDiff is not published to npm yet, and there is no released Action tag.
Until then, build it from source:

```sh
git clone https://github.com/JacobisEpic/playbookdiff.git
cd playbookdiff
pnpm install
pnpm build
```

Requires Node.js 24 (24.11.0 or newer, within 24.x) and pnpm 11.24.0.

That produces a real executable at `packages/cli/dist/bin.js`.
Run it against any repository:

```sh
node packages/cli/dist/bin.js check /path/to/your/repo
```

To get a plain `playbookdiff` command, install the built package globally from `packages/cli`:

```sh
npm install -g ./packages/cli
```

## Run it locally

```sh
playbookdiff check .
```

The most useful workflow is asking whether a change introduced a new divergence, without failing on divergence that was already there:

```sh
playbookdiff diff origin/main..HEAD
```

With no `--path`, `diff` derives the contexts to analyze from the paths the range changed, so configuration nested under what you touched is covered.
It never modifies your working tree, branch, or `HEAD`, and never fetches.

Exit codes: `0` no actionable divergence, `1` actionable findings exist, `2` the analysis could not run.

See [the CLI reference](docs/cli.md) for `check`, `explain`, `diff`, and the `--cwd` versus `--path` distinction.

## Use it in CI

> **Not yet released.** The workflow below is the intended usage once a tag exists.
> No release tag exists today, so this snippet does not resolve yet - see [the GitHub Action reference](docs/github-action.md) for what a real install requires now.

```yaml
on: pull_request

permissions:
  contents: read

jobs:
  playbookdiff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: JacobisEpic/playbookdiff@v0
```

That is the whole configuration.
The Action analyzes the repository root plus the configuration scopes the pull request touched, and fails only when the pull request introduces a _new_ actionable regression - never on pre-existing divergence.
It needs `contents: read`, no token, and no API access, so fork pull requests behave the same as internal ones.

## What "unknown" means

PlaybookDiff reports three outcomes, and the third is the important one.

**Equivalent** means the compared configuration matched exactly.
**Divergent** means a deterministic structural difference was proved.
**Unknown** means the analyzer mechanically established that the available evidence is not enough to decide.

The most common unknown is prose: two instruction files that say roughly the same thing in different words.
PlaybookDiff can prove the text differs. It cannot prove differently worded guidance conflicts, so it says so instead of guessing in either direction.

Unknown findings are informational and never fail CI.
An unknown is not a shrug - it is a claim, backed by the same determinism as the rest, that this particular question cannot be answered without semantic analysis.

## What it does not claim

- **Not that two agents behave the same.** It compares configuration, not behavior. Identical configuration does not make different models act alike.
- **Not that differing prose means the same thing, or conflicts.** That is reported as unknown, permanently, by design.
- **Not that a configured capability works.** A configured MCP server proves the repository configured it, not that it is reachable, authenticated, or approved.
- **Not that it sees your whole setup.** It describes repository-defined configuration. User-level, machine-level, and managed configuration are not visible to it.
- **Not that divergence is a mistake.** Plenty of divergence is deliberate. PlaybookDiff tells you it exists; whether it should is your call.

Full detail in [scope and limitations](docs/limitations.md).

## Documentation

- [CLI reference](docs/cli.md) - commands, `--cwd` versus `--path`, exit codes, JSON output
- [GitHub Action](docs/github-action.md) - inputs, outputs, coverage, security posture
- [Scope and limitations](docs/limitations.md) - supported semantics matrix and what is unsupported
- [Validation](docs/validation.md) - how the analyzer is tested and what that does not prove
- [Security model](docs/security.md) - read-only, no execution, no network, no secret resolution
- [Comparison specification](docs/comparison.md) - the deterministic comparison rules
- [Git diff specification](docs/git-diff.md) - regression semantics
- [Architecture](docs/architecture.md) - how the pieces fit together
- Harness specifications: [Claude Code](docs/harnesses/claude.md), [Codex](docs/harnesses/codex.md)

## Status

Pre-release, heading for a public beta.
The deterministic engine, the CLI, and the Action have been validated against real open-source repositories with substantial agent configuration; see [validation](docs/validation.md).

Semantic comparison, PR comments, a hosted service, and support for additional harnesses are intentionally not implemented.

## Contributing

Harness behavior must be supported by official documentation or a reproducible fixture - never by intuition.
See [CONTRIBUTING](CONTRIBUTING.md).

## License

[MIT](LICENSE)
