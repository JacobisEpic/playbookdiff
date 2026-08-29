# CLI

`playbookdiff` is the terminal entry point for the deterministic comparator implemented in `packages/core`.
It compiles a repository's effective Claude Code and Codex configuration, compares them, and prints the resulting `CompatibilityReport`.

## Development invocation

The CLI package is `packages/cli` and builds to a real executable at `packages/cli/dist/bin.js`.
From a clean checkout:

```sh
pnpm install
pnpm --filter playbookdiff build
```

Then run it directly:

```sh
node packages/cli/dist/bin.js check .
```

or through the root convenience script, which forwards arguments:

```sh
pnpm playbookdiff check .
```

This workspace does not currently install `playbookdiff` onto `PATH` (it is not a dependency of any other workspace package, so pnpm has no reason to link its `bin` entry).
Installing the package globally (`npm install -g .` from `packages/cli`, or publishing it) makes the plain `playbookdiff` command available, using the `bin` field already declared in `packages/cli/package.json`.

## Commands

```text
playbookdiff check [repository]
playbookdiff explain <finding-id> [repository]
playbookdiff --help
playbookdiff --version
```

`repository` defaults to `.` for both commands.

### `check`

Compiles both harnesses' effective configuration for the given repository/cwd/target and prints the resulting `CompatibilityReport`.

```sh
playbookdiff check .
playbookdiff check ./my-repo --cwd apps/web
playbookdiff check . --path apps/web/src/page.tsx
playbookdiff check . --cwd apps/web --path apps/web/src/page.tsx --json
```

### `explain`

Re-runs the same analysis and prints a detailed explanation of one finding, looked up by its stable ID (as printed by `check`).
`explain` is stateless: it does not persist prior `check` runs, so it needs the same `--cwd`/`--path` you used to produce the ID, since a finding may only exist for a particular scope.

```sh
playbookdiff explain <finding-id> .
playbookdiff explain <finding-id> . --cwd apps/web --path apps/web/src/page.tsx --json
```

If the ID does not exist for the given repository/cwd/target, `explain` reports a lookup failure (exit code 2) rather than guessing a nearby match.

## `--cwd` vs `--path`

These model two different things and must not be confused:

- `--cwd` models the directory the coding agent was **launched from**. It is interpreted relative to the repository and defaults to the repository root (`.`).
- `--path` models the repository path the coding agent is **working on**. It is also interpreted relative to the repository, and has no default (an unset `--path` means "no specific target").

They matter independently because Codex's repository configuration discovery is bounded by the launch `cwd`, while Claude Code can discover additional configuration nested under the target path on demand.
The same `--path` can produce a different report depending on `--cwd`:

```sh
playbookdiff check . --cwd . --path apps/web/src/page.tsx
playbookdiff check . --cwd apps/web --path apps/web/src/page.tsx
```

In the first invocation, Codex is bounded to the repository root and may not discover `apps/web`-scoped configuration; in the second, launching from `apps/web` puts that configuration in scope for Codex too.
PlaybookDiff models this distinction explicitly rather than collapsing it into one "working directory" concept.

## Exit codes

```text
0   analysis completed; no actionable compatibility divergence found
1   analysis completed; one or more actionable (medium/high severity) findings exist
2   PlaybookDiff could not perform the analysis (invalid input, path escape, lookup failure, ...)
```

A deterministic `unknown` finding (informational, severity `info`) never causes exit code 1 by itself, and never causes exit code 2.
`--help` and `--version` always exit 0.

## `--json`

`check --json` and `explain --json` print machine-readable JSON to stdout and never mix in ANSI styling or log lines; errors still go to stderr.
An actionable `check --json` result still exits 1.

The JSON contracts are intentionally minimal wrappers around the existing `CompatibilityReport`/`CompatibilityFinding` types from `@playbookdiff/core`, rather than a second, CLI-specific report shape:

```ts
// check --json
{ context: { repository, cwd, targetPath? }, report: CompatibilityReport }

// explain --json
{ context: { repository, cwd, targetPath? }, finding: CompatibilityFinding }
```

`context.cwd`/`context.targetPath` are the repo-relative values the adapters actually resolved (from the compiled config's `target`), so displayed context always reflects what was analyzed, not just what was typed.

## Deterministic limitations

The CLI does not add semantic interpretation beyond what `packages/core`'s comparator already proves.
In particular:

- Different instruction prose at the same effective scope is reported as an informational `unknown`, never as a claimed conflict or claimed equivalence.
- A capability appearing in repository configuration is reported as configured, not as verified at runtime.
- PlaybookDiff detects structured differences; it does not infer that two harnesses will _behave_ identically or differently.

See [`docs/comparison.md`](comparison.md) for the full deterministic comparison specification.
