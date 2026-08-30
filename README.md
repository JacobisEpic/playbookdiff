# PlaybookDiff

> Make sure Claude Code and Codex are working from the same playbook.

PlaybookDiff is a read-only cross-agent configuration compatibility checker for Claude Code and Codex.
It will compile the repository-defined instructions and capabilities each harness receives, preserve provenance, and explain material divergence.
It does not modify analyzed repositories and does not claim that different coding agents will behave identically.

## Status

Phase 7 adds a reusable GitHub Action on top of the Phase 6 Git regression engine: add PlaybookDiff to a pull-request workflow and it fails CI only when the PR introduces a new deterministic Claude Code ↔ Codex compatibility regression.
Semantic AI, PR comments/Checks API integration, and the web application are intentionally not implemented yet.

## CLI

```sh
pnpm install
pnpm --filter playbookdiff build
pnpm playbookdiff check .
```

The most useful workflow is checking whether a change introduced a new cross-agent regression, without failing on debt that was already there:

```sh
pnpm playbookdiff diff origin/main..HEAD --path apps/web/src/page.tsx
```

This fails only when the candidate introduces a new actionable Claude Code ↔ Codex compatibility regression; it never fails on pre-existing divergence, and it never touches your working tree, branch, or `HEAD`.

See [the CLI reference](docs/cli.md) for `check`, `explain`, `diff`, `--cwd` vs `--path`, `--json`, and exit codes, and [the Git diff specification](docs/git-diff.md) for `diff`'s full regression semantics.

## GitHub Action

The same check runs natively in pull-request CI:

```yaml
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

      - uses: JacobisEpic/playbookdiff@v1
```

Fails a pull request only when it introduces a new actionable Claude Code ↔ Codex repository-configuration regression - never on pre-existing divergence, and never by claiming the two agents behave identically.

See [the GitHub Action reference](docs/github-action.md) for inputs, outputs, automatic PR baseline/candidate detection, checkout requirements, security/fork-PR behavior, and current release status (there is no `v1` tag yet - see that document for what a real install requires today).

## Development

Requirements:

- Node.js 24 LTS, version 24.11.0 or newer within the 24.x release line
- pnpm 11.24.0

Install and validate the workspace:

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm fmt:check
pnpm test
pnpm build
```

See [the architecture notes](docs/architecture.md), [the deterministic comparison specification](docs/comparison.md), [the CLI reference](docs/cli.md), [the Git diff specification](docs/git-diff.md), [the GitHub Action reference](docs/github-action.md), [the Claude Code harness specification](docs/harnesses/claude.md), and [the Codex harness specification](docs/harnesses/codex.md).

## License

[MIT](LICENSE)
