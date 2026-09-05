# PlaybookDiff

[![CI](https://github.com/JacobisEpic/playbookdiff/actions/workflows/ci.yml/badge.svg)](https://github.com/JacobisEpic/playbookdiff/actions/workflows/ci.yml)

> Make sure Claude Code and Codex are working from the same playbook.

PlaybookDiff is a deterministic, read-only compatibility checker for repositories that configure both Claude Code and Codex.
It compiles the instructions, skills, and MCP servers each harness effectively receives, then reports proven differences with source evidence.

A raw diff of `CLAUDE.md` and `AGENTS.md` is not enough.
The harnesses use different discovery rules, nested scopes, imports, settings, and skill conventions, so two files can look parallel while producing different effective configuration.

PlaybookDiff never modifies the repository it analyzes, executes its code, connects to MCP servers, resolves secrets, or calls a model.
It compares configuration, not agent behavior.

## Effective configuration in one example

Suppose a repository contains matching root and `apps/api` instructions and skills for both agents.
When an agent works on `apps/api/file.ts` but was launched from the repository root, Claude Code can discover the nested configuration on demand while Codex remains bounded by its launch-directory chain.

```text
your-repo/
├── CLAUDE.md                         Claude Code instruction
├── AGENTS.md                         Codex instruction
├── .claude/skills/root-skill/        Claude Code skill
├── .agents/skills/root-skill/        Codex skill
└── apps/api/
    ├── CLAUDE.md                     reached by Claude Code
    ├── AGENTS.md                     not reached by Codex from cwd=.
    ├── .claude/skills/api-skill/     reached by Claude Code
    └── .agents/skills/api-skill/     not reached by Codex from cwd=.
```

The files are all present and their contents match.
The effective configuration still diverges because only one harness receives the nested instruction and skill in that context.

The checked-in [effective-scope example](examples/effective-scope/README.md) reproduces this result using the real adapters and a test-protected fixture.

## What PlaybookDiff models

| Surface       | Claude Code                                                                        | Codex                                                                       | Comparison                                                                            |
| ------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Instructions  | `CLAUDE.md`, `.claude/CLAUDE.md`, imports, nested instructions, `.claude/rules/**` | `AGENTS.md`, `AGENTS.override.md`, fallback names, nested instruction chain | Exact content, effective scope, load phase, and proven one-sided coverage             |
| Skills        | `.claude/skills/*/SKILL.md` and supported frontmatter                              | `.agents/skills/*/SKILL.md` and `agents/openai.yaml` invocation policy      | Presence, discovery state, invocation policy, advertisement, and description          |
| MCP servers   | `.mcp.json`                                                                        | `mcp_servers` in `.codex/config.toml`                                       | Name, transport, command, ordered arguments, URL, and symbolic environment references |
| Git revisions | Baseline effective configuration                                                   | Candidate effective configuration                                           | Introduced, resolved, and unchanged findings matched by stable ID                     |

Skill bodies, runtime MCP availability, user or managed configuration, hooks, permissions, plugin systems, and agent behavior are not compared.
See the [complete supported-semantics matrix](docs/limitations.md) for the precise boundaries.

## Try the CLI

The CLI package is prepared and locally verified as an npm tarball, but it has not been published to npm.
Until the first publication, build it from source with Node.js 24.11 or newer within the 24.x release line and pnpm 11.24.0:

```sh
git clone https://github.com/JacobisEpic/playbookdiff.git
cd playbookdiff
pnpm install --frozen-lockfile
pnpm build
node packages/cli/dist/bin.js check /path/to/your/repo
```

You can also install the built package globally from the checkout to get the plain command:

```sh
npm install --global ./packages/cli
playbookdiff check /path/to/your/repo
```

The primary commands are:

```text
playbookdiff check [repository]
playbookdiff explain <finding-id> [repository]
playbookdiff diff <baseline>..<candidate> [repository]
```

`diff` reports only findings introduced or resolved between two committed Git revisions.
It does not fail on divergence that already existed, modify the working tree, move `HEAD`, run Git hooks, or fetch.

Exit codes are `0` for no actionable divergence, `1` for actionable findings, and `2` when analysis cannot run.
See the [CLI reference](docs/cli.md) for all options and the important distinction between `--cwd` and `--path`.

## Representative output

```text
PlaybookDiff

Claude Code <-> Codex

Launch cwd: .
Target: apps/api/file.ts

Findings: 2 medium, 0 low, 0 info

MEDIUM  Instruction missing
        Claude Code has an instruction for this effective scope, while Codex has no
        deterministic corresponding instruction.
        Evidence:
          - Claude Code instruction: apps/api/CLAUDE.md:1-2 (repository)

MEDIUM  Skill capability gap
        The api-skill skill is repository-discovered only for Claude Code, not Codex.
        Evidence:
          - Claude Code skill: apps/api/.claude/skills/api-skill/SKILL.md (repository)
```

Every finding includes stable identity, provenance, context, confidence, and evidence in human-readable and JSON output.

## Use it in GitHub Actions

The released Action compares the pull request base and candidate, then fails only for newly introduced actionable findings.

```yaml
name: PlaybookDiff

on:
  pull_request:

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

`v0` tracks the latest compatible `0.x` Action release.
Pin `JacobisEpic/playbookdiff@v0.2.0` or a commit SHA when you need immutable resolution.
The Action requires no token beyond `contents: read`, performs no API calls, and works for fork pull requests.
See the [GitHub Action reference](docs/github-action.md) for inputs, outputs, coverage, and release details.

## Equivalent, divergent, and unknown

- **Equivalent** means the compared configuration matches under a deterministic rule.
- **Divergent** means a structural difference is proven from repository evidence.
- **Unknown** means the available evidence is insufficient to decide without guessing.

Different prose is the common example of `unknown`.
PlaybookDiff can prove two instruction bodies differ, but it cannot prove differently worded guidance is equivalent or conflicting without semantic interpretation.
That result is informational and never fails CI.

`unknown` is therefore a useful boundary, not a fallback.
It tells reviewers exactly where deterministic analysis stops.

## Safety and deliberate non-claims

PlaybookDiff:

- reads repository files without changing them
- never executes analyzed scripts, binaries, hooks, skills, or package commands
- never connects to configured MCP servers or tests their runtime availability
- never resolves secret values or serializes host paths into findings
- never calls a model or requires an API key
- never claims that matching configuration makes different agents behave alike
- never treats differently worded prose as semantically equivalent or conflicting
- never assumes that divergence is a mistake

The [security model](docs/security.md), [comparison specification](docs/comparison.md), and [validation strategy](docs/validation.md) document how these properties are enforced.

## Documentation

- [CLI reference](docs/cli.md)
- [GitHub Action](docs/github-action.md)
- [Scope and limitations](docs/limitations.md)
- [Security model](docs/security.md)
- [Comparison specification](docs/comparison.md)
- [Git diff specification](docs/git-diff.md)
- [Architecture](docs/architecture.md)
- [Validation strategy](docs/validation.md)
- [Release process](docs/releasing.md)
- Harness specifications: [Claude Code](docs/harnesses/claude.md) and [Codex](docs/harnesses/codex.md)

## Project status

The current public release is `v0.2.0`.
The deterministic engine, CLI, and GitHub Action are usable, while the CLI's first npm publication remains a manual release step.

During `0.x`, command output, JSON contracts, and Action outputs may change between minor releases.
The core policy will not: when compatibility cannot be established deterministically, the result stays `unknown`.

Additional harnesses, semantic comparison, PR comments, and a hosted analysis service are deliberately outside the current release scope.

## Contributing

Harness behavior must be supported by current official documentation or a reproducible fixture, never by intuition.
See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
