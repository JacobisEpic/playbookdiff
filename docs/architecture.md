# Architecture

## Product boundary

PlaybookDiff answers whether Claude Code and Codex receive compatible repository-defined instructions and capabilities for a given repository, launch directory, and optional target path.
The analyzer is read-only.
It distinguishes repository configuration from machine-effective configuration and configured capabilities from runtime capabilities.

The initial comparison surfaces are instructions, skills, and MCP configuration.
Agent execution, configuration synchronization, behavioral benchmarking, hooks, permissions, subagents, plugins, and additional harnesses are outside the initial scope.

## Package boundaries

- `packages/core` owns normalized types, comparison concepts, findings, and provenance.
- `packages/harness-claude` will own Claude Code discovery and resolution semantics.
- `packages/harness-codex` will own Codex discovery and resolution semantics.
- `packages/cli` will eventually expose the `playbookdiff` command.
- `packages/action` (Phase 7) wraps the CLI's `runDiff` orchestration as a GitHub Action. It owns GitHub-specific presentation only (input/event-context resolution, Step Summary Markdown, Action outputs) and contains no comparator, actionability, or regression logic of its own; `packages/core` remains entirely GitHub-agnostic.

Adapters will compile harness-specific repository configuration into the shared `EffectiveAgentConfig` representation.
Comparators must consume normalized configurations and must not perform filesystem discovery.

## Locked stack

The repository uses Node.js 24 LTS, strict TypeScript 6, ESM, pnpm workspaces, Turborepo, tsdown, Vitest, Oxlint, and Oxfmt.
Future phases reserve citty for the CLI, syntax-aware Markdown and configuration parsers for adapters, Zod at untrusted runtime boundaries, Vercel AI SDK for optional semantic classification, and Next.js for a thin hosted interface.
Isolated Git revision analysis (Phase 6) uses Node's built-in `child_process` and `git worktree` directly rather than an added dependency.
Those future dependencies are intentionally absent from Phase 1.

## Phase 1 boundary

Only `packages/core` contains meaningful domain code in Phase 1.
The harness and CLI packages are buildable placeholders.
There is no adapter discovery, comparator, CLI command, repository execution, Git revision analysis, semantic AI, or web implementation.
