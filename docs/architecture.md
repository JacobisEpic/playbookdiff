# Architecture

## Product boundary

PlaybookDiff answers whether Claude Code and Codex receive compatible repository-defined instructions and configured capabilities for a repository, launch directory, and optional target path.
The analyzer is read-only and deterministic.
It distinguishes repository configuration from machine-effective configuration and configured capabilities from runtime capabilities.

The comparison surfaces are instructions, skills, and MCP configuration.
The CLI also compares reports from committed Git revisions to identify introduced, resolved, and unchanged findings.

Agent execution, configuration synchronization, behavioral benchmarking, semantic inference, hooks, permissions, subagents, plugins, and additional harnesses are outside the current scope.

## Package boundaries

- `packages/core` owns normalized types, comparison rules, finding identity, report deltas, and provenance.
- `packages/harness-claude` owns Claude Code discovery, parsing, resolution, applicability, and diagnostics.
- `packages/harness-codex` owns Codex discovery, parsing, resolution, applicability, and diagnostics.
- `packages/cli` orchestrates both adapters, formats reports, applies exit-code policy, and materializes committed Git revisions in isolated worktrees.
- `packages/action` resolves GitHub event context and presents CLI diff results as Action outputs and a Step Summary.
- `website` is an independent Next.js package that presents checked-in fixture evidence without running the analyzer in a browser.

Harness-specific behavior stays in its adapter.
Adapters compile repository configuration into the shared `EffectiveAgentConfig` representation.
Comparators consume normalized configurations and never perform filesystem discovery.

The CLI bundles the private core and adapter packages plus their third-party libraries into its npm artifact.
The installed package has zero runtime dependencies, so consumers never resolve `workspace:*` packages or download a separate dependency graph.

The GitHub Action bundle is fully self-contained and committed at `packages/action/dist/index.mjs` because a JavaScript Action is not installed or built in the consuming workflow.

## Analysis flow

1. The CLI validates the repository root, launch directory, and optional work target.
2. Both adapters independently compile the effective repository-defined configuration for the same context.
3. The core comparator matches normalized entities conservatively and emits equivalent counts or evidence-backed findings.
4. Human and JSON formatters preserve finding identity, source provenance, diagnostics, and uncertainty.
5. For `diff`, the CLI reads two committed revisions through disposable detached Git worktrees, compares their reports by stable finding ID, then removes the worktrees.

No stage executes files from the analyzed repository, starts an MCP server, resolves secret values, calls a model, or fetches a remote.

## Toolchain

The root workspace uses Node.js 24 LTS, strict TypeScript 6, ESM, pnpm workspaces, Turborepo, tsdown, Vitest, Oxlint, and Oxfmt.
The standalone website uses its own npm lockfile and does not import workspace packages.

Conventional CI validates the workspace and website independently.
The release checks also rebuild the committed Action bundle and install the packed CLI into a clean temporary consumer project.

See [the security model](security.md), [the comparison specification](comparison.md), and [the Git diff specification](git-diff.md) for the invariants behind each layer.
