# PlaybookDiff

> Make sure Claude Code and Codex are working from the same playbook.

PlaybookDiff is a read-only cross-agent configuration compatibility checker for Claude Code and Codex.
It will compile the repository-defined instructions and capabilities each harness receives, preserve provenance, and explain material divergence.
It does not modify analyzed repositories and does not claim that different coding agents will behave identically.

## Status

Phase 6 adds Git-aware regression diffing on top of the Phase 5 `playbookdiff` CLI: `diff` compares two Git revisions and reports only the compatibility regressions the candidate introduced, leaving pre-existing divergence alone.
Semantic AI, CI/GitHub integration, and the web application are intentionally not implemented yet.

## CLI

```sh
pnpm install
pnpm --filter playbookdiff build
pnpm playbookdiff check .
```

The most useful new workflow is checking whether a change introduced a new cross-agent regression, without failing on debt that was already there:

```sh
pnpm playbookdiff diff origin/main..HEAD --path apps/web/src/page.tsx
```

This fails only when the candidate introduces a new actionable Claude Code ↔ Codex compatibility regression; it never fails on pre-existing divergence, and it never touches your working tree, branch, or `HEAD`.

See [the CLI reference](docs/cli.md) for `check`, `explain`, `diff`, `--cwd` vs `--path`, `--json`, and exit codes, and [the Git diff specification](docs/git-diff.md) for `diff`'s full regression semantics.

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

See [the architecture notes](docs/architecture.md), [the deterministic comparison specification](docs/comparison.md), [the CLI reference](docs/cli.md), [the Git diff specification](docs/git-diff.md), [the Claude Code harness specification](docs/harnesses/claude.md), and [the Codex harness specification](docs/harnesses/codex.md).

## License

[MIT](LICENSE)
