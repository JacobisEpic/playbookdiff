# PlaybookDiff

> Make sure Claude Code and Codex are working from the same playbook.

PlaybookDiff is a read-only cross-agent configuration compatibility checker for Claude Code and Codex.
It will compile the repository-defined instructions and capabilities each harness receives, preserve provenance, and explain material divergence.
It does not modify analyzed repositories and does not claim that different coding agents will behave identically.

## Status

Phase 5 adds a production-usable `playbookdiff` CLI on top of the Phase 4 deterministic comparator: `check` and `explain`, human and JSON output, and CI-usable exit codes.
Git revision analysis, semantic AI, and the web application are intentionally not implemented yet.

## CLI

```sh
pnpm install
pnpm --filter playbookdiff build
pnpm playbookdiff check .
```

See [the CLI reference](docs/cli.md) for `check`, `explain`, `--cwd` vs `--path`, `--json`, and exit codes.

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

See [the architecture notes](docs/architecture.md), [the deterministic comparison specification](docs/comparison.md), [the CLI reference](docs/cli.md), [the Claude Code harness specification](docs/harnesses/claude.md), and [the Codex harness specification](docs/harnesses/codex.md).

## License

[MIT](LICENSE)
