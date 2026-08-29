# Claude Code harness specification

## Verification record

Last verified: 2026-08-28.

Status: Phase 2 contributor specification.
The deterministic subset described below is implemented in `packages/harness-claude` (`compileClaudeConfig`), fixture-tested under `packages/harness-claude/test/fixtures/`. It does not compare Claude to Codex, and it does not implement semantic AI, a CLI, Git diffing, or the web app.

This specification is based on current official Claude Code documentation, especially:

- [How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Extend Claude with skills](https://code.claude.com/docs/en/slash-commands)
- [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp)
- [Claude Code settings](https://code.claude.com/docs/en/settings)
- [Use Claude Code features in the SDK](https://code.claude.com/docs/en/agent-sdk/claude-code-features)
- [Debug your configuration](https://code.claude.com/docs/en/debug-your-config)

Official documentation is normative for documented behavior.
Reproducible observations from the real Claude Code harness are the next source of evidence.
Where current documentation conflicts with the kickoff contract or omits a mechanical detail, this document records the gap rather than guessing.

## Adapter purpose

The future Claude adapter will answer:

> Given a repository, launch directory, target path, and analysis mode, which supported repository-defined instructions, skills, and MCP servers can Claude Code receive, and exactly where did each item come from?

It will compile Claude-specific discovery into the shared `EffectiveAgentConfig` representation.
It will not compare harnesses, execute repository code, connect to MCP servers, or infer hidden machine state.

The result is the effective repository-defined configuration under stated assumptions.
It is not the total machine-effective configuration for a particular developer.

## Analysis context

The adapter receives an `AnalysisContext` with four independent values.

- `repositoryRoot` is PlaybookDiff's logical repository boundary.
- `cwd` is the directory from which Claude Code is assumed to start.
- `targetPath` is an optional path Claude is expected to read or edit after startup.
- `mode` is `repo` or `local`.

`cwd` and `targetPath` are not interchangeable.
Claude eagerly loads applicable ancestor instructions through `cwd`, then may load descendant instructions and skills on demand as files are accessed.
The optional `targetPath` lets static analysis model one intended access path, but it cannot prove the complete lazy-loading history of an interactive session.

## Analysis modes

### Repo mode

Repo mode includes reproducible repository-visible configuration only.
It excludes or marks unknown:

- `~/.claude/CLAUDE.md`
- `~/.claude/rules/`
- `~/.claude/skills/`
- `~/.claude/settings.json`
- `CLAUDE.local.md` (present in the repository working tree, but a personal, conventionally git-ignored override - not reproducible repository-defined configuration; the adapter emits a `local-config-unavailable` diagnostic per discovered file instead of silently dropping it)
- local and user MCP definitions outside the repository
- managed enterprise and server-managed settings
- trust and interactive approval state
- authentication state
- runtime MCP connectivity and server capabilities
- runtime MCP server instructions

Repo-mode output must describe repository-defined Claude Code configuration under stated assumptions.
It must not claim to represent the complete configuration a developer receives.

### Local mode

Local mode may eventually include accessible machine-local sources such as user instructions, user skills, local settings, and local MCP definitions.
It still cannot assume knowledge of managed or server-side policy, remote authentication, or runtime MCP behavior.
Every local source must retain its scope and provenance so it cannot be mistaken for reproducible repository state.

Phase 2 implements one local-mode behavior: `CLAUDE.local.md` is compiled with `source.scope = "local"` (repo mode excludes it entirely; see above). Machine-external local sources (`~/.claude/CLAUDE.md`, user skills, local settings, local MCP definitions) remain unimplemented.

## Instructions

### Supported repository sources

The initial instruction surface recognizes:

- `CLAUDE.md`
- `.claude/CLAUDE.md`
- `CLAUDE.local.md` where the analysis mode permits it
- nested `CLAUDE.md`
- nested `CLAUDE.local.md`
- Markdown rules under applicable `.claude/rules/` directories
- supported imports reached from those files

Claude Code does not natively treat `AGENTS.md` as an instruction source.
It contributes only when a supported Claude instruction file imports it, such as `@AGENTS.md`.
The adapter must never load `AGENTS.md` merely because it exists.

Both files coexisting was empirically verified during Phase 2 development, not merely inferred from documentation. An isolated fixture (outside this repository, outside `~/.claude`, with an isolated `CLAUDE_CONFIG_DIR`) contained distinctly-marked `CLAUDE.md` and `.claude/CLAUDE.md` files and a project-scoped `InstructionsLoaded` hook logging its raw JSON payload. One headless `claude -p` invocation produced two `InstructionsLoaded` events with `load_reason: "session_start"`, `memory_type: "Project"`: first for `CLAUDE.md`, then for `.claude/CLAUDE.md`. Both files load - this is not one-wins, and the ambiguity the Phase 1 spec flagged here is resolved. The adapter discovers both, in that order, at every directory in the ancestor chain (not only the outermost project root) - the `.claude/CLAUDE.md` check is generalized to each ancestor level by extension from the empirical root-level result, not independently verified at nested levels.

### Startup discovery

At startup, Claude discovers `CLAUDE.md` and `CLAUDE.local.md` from `cwd` and its ancestors.
Applicable files are ordered from the filesystem root toward `cwd`, so broad instructions precede more specific instructions.
Within one directory, `CLAUDE.local.md` follows `CLAUDE.md` under the documented hierarchy.

Instruction files are concatenated as context.
The documentation does not define deterministic last-wins conflict resolution for contradictory prose.
The adapter must preserve content and order without claiming that a later natural-language instruction mechanically overrides an earlier one.

Repo mode includes only ancestors within `repositoryRoot`.
It records unavailable user or machine scopes as diagnostics instead of silently treating them as absent.

### Nested on-demand discovery

Instruction files below `cwd` are not eagerly included in startup context.
Claude may load a descendant `CLAUDE.md` or `CLAUDE.local.md` after reading files in that descendant subtree.

For this layout:

```text
repo/
├── CLAUDE.md
└── apps/
    └── api/
        └── CLAUDE.md
```

`cwd = repo/` loads the root file at startup.
With `targetPath = repo/apps/api/file.ts`, PlaybookDiff may mark the nested file relevant with `loadPhase = "on-demand"`.
Without `targetPath`, a discoverable descendant source remains conditional rather than effective startup context.

This behavior intentionally differs from Codex, whose project `AGENTS.md` chain stops at `cwd`.
The normalized representation must expose that scope difference.

### Imports

Claude instruction files can import another file with `@path` syntax.
Relative paths resolve from the containing file and absolute paths may exist.
The documented import recursion limit is four hops.

Import parsing must use Markdown syntax and source positions.
Import-looking text inside inline code or fenced code blocks is not an import.
The future adapter must not use a raw-text regular expression that ignores Markdown structure.

Current documentation describes an external import as one that resolves outside the working directory, not merely outside the repository.
In an interactive local session, first use of such an import can require approval.
Repo mode cannot know approval history.

If an import remains inside `repositoryRoot` but outside `cwd`, the adapter may parse it as reproducible evidence but must preserve conditional approval state.
If it resolves outside `repositoryRoot`, repo mode must not silently follow it and must emit an `outside-repository` or `unresolved` diagnostic.

PlaybookDiff must detect cycles defensively and stop recursion safely.
Official documentation does not establish Claude Code's native import-cycle behavior, so cycle handling must be labeled an analyzer safety behavior rather than a harness claim.

### Rules

Markdown files are recursively discovered within an applicable `.claude/rules/` directory.
A rule with no `paths` frontmatter is unconditional for the scope in which that rules directory is active.
A rule with `paths` frontmatter becomes relevant when Claude accesses a matching path.
With no `targetPath`, a path-scoped rule remains conditional.

Path matching is isolated behind a single Claude-specific matcher, `matchesClaudeRulePath` (`packages/harness-claude/src/rules.ts`), shared with skill `paths` frontmatter, and locked by fixtures.
Anchor confirmed by the official docs' own pattern table (`docs/en/memory#path-specific-rules`): `*.md` matches only project-root Markdown (not recursively) and `src/**/*` is project-relative, so `paths` patterns are anchored to `repositoryRoot`, matched against the repo-relative POSIX form of `targetPath` - this is documented Claude Code behavior, not a PlaybookDiff-invented convention. The matcher also treats an invalid pattern (e.g. an unescaped bracket expression) as matching nothing rather than throwing, per the same documentation. The adapter preserves each rule file, frontmatter source, source position, matching reason, and on-demand state.

The kickoff contract intentionally limited recursion to the relevant project `.claude/rules/` directory and prohibited scanning arbitrary nested rule roots without fixture evidence.
Official documentation confirms the _existence_ of this mechanism: rules in nested `.claude/rules/` directories load on demand (`docs/en/memory`: "Before v2.1.211, rules that load on demand, including path-scoped rules and rules in nested `.claude/rules/` directories, loaded even when `project` was excluded" - a nested `.claude/rules/` root is a real, documented thing).
What remains unresolved is the exact traversal order and glob anchor for a _separately nested_ rule root (one below `cwd`, independent of the ancestor-chain rules root Phase 2 discovers).

Phase 2 implements the ancestor-chain rules root (recursing into its own subdirectories, e.g. `.claude/rules/backend/api.md`, which the official docs explicitly support) and detects a separately nested `.claude/rules/` root when `targetPath` reaches it, but does not read it - it emits an `unresolved` diagnostic naming the directory instead of silently discovering or silently ignoring it.
Broadening deterministic discovery to that case needs a fixture verifying its traversal/order/glob-anchor mechanics, which Phase 2 does not attempt.

### `claudeMdExcludes`

The `claudeMdExcludes` setting can exclude instruction and rules files using absolute-path glob matching.
Array values from applicable settings layers are merged, while managed instructions cannot be excluded.

Project settings discovery is launch-directory-sensitive.
Current documentation says project `.claude/settings.json` is loaded from `<cwd>/.claude/` without parent fallback, even though instruction and rules discovery scans ancestors.
The future adapter must not search every ancestor for project settings merely because it does so for `CLAUDE.md`.

General settings comparison remains outside v0.1.
Parsing a discovery-affecting setting is allowed only because it changes the supported instruction, skill, or MCP result.

## Skills

### Discovery

Claude discovers project skills under `.claude/skills/<skill-name>/SKILL.md` from `cwd` and its ancestors through the repository root.
Claude can also discover descendant skill directories on demand after reading or editing a file in their subtree, and those skills remain available for the session.

A `targetPath` can model one descendant access path.
Without a target, descendant skills remain conditional because static analysis cannot know future file accesses.

Root and nested same-name skills are not trivial duplicates.
Official documentation describes a directory-qualified invocation identifier for a colliding nested skill (e.g. `apps/web:deploy`), and this was independently observed live during Phase 2 development: creating two fixture skills both named `deploy` (one at a project root, one nested under `apps/web/`) caused the _implementing session's own_ Claude Code instance to list both under directory-qualified names in its live skill listing, unprompted. That observation also sharpened the mechanism: qualification is collision-driven, not nesting-driven (two non-colliding nested skills in the same session listed under their bare names), and the collision check spans names outside repo-mode visibility (bundled commands, user skills, plugins). Because of that last point, the adapter does not synthesize the qualified identifier from repository state alone - both variants keep their bare declared name, are preserved separately (never collapsed), and are related via `crossReferences`, with a diagnostic citing this finding.

### Invocation

By default, a project skill permits both explicit user invocation and implicit model invocation.

`disable-model-invocation: true` maps to:

- explicit invocation `allowed`
- implicit invocation `blocked`
- model description hidden

`user-invocable: false` maps to:

- explicit invocation `blocked`
- implicit invocation `allowed`
- model description advertised

Skill frontmatter also supports `paths` globs that condition automatic activation; the official docs state this field "Uses the same format as path-specific rules" (`docs/en/skills`), confirming it shares anchoring and matcher behavior with rule `paths` frontmatter - Phase 2 reuses `matchesClaudeRulePath` for both.
For a concrete matching target, the adapter resolves implicit invocation to `allowed` or `blocked` with provenance.
Without a target, implicit invocation is `unknown` unless another setting deterministically blocks it, and an `assumption` diagnostic records the unresolved path applicability.

### Advertisement

Skill discovery, invocation, and initial advertisement are separate concepts.
The model initially receives advertised skill names and description metadata, then loads full skill instructions on use.

The current documented aggregate listing budget is 1 percent of the model context.
Combined `description` and `when_to_use` text is capped at 1,536 characters per skill by default, and settings can alter both limits.

When the aggregate budget is exceeded, current documentation says every advertised skill name remains listed while descriptions are removed starting with least-used skills.
The exact result depends on session history, model context, settings, and invisible skills.
The adapter must use `budget-risk` conservatively and must not fabricate a dropped skill or description.

Repository `skillOverrides` settings can force states including `on`, `name-only`, `user-invocable-only`, and `off`.
Those settings affect the supported skill surface, but the Phase 1 `AdvertisementState` union cannot represent deterministic `name-only` exposure directly.
Phase 2 must resolve this schema gap before claiming support for `skillOverrides`.

Current Claude Code also treats `.claude/commands/*.md` as a legacy form of the skill mechanism, with skills taking precedence on name collision.
The kickoff contract includes `.claude/skills` only.
Custom commands are explicitly unsupported in v0.1 and must produce a scope diagnostic if detected rather than being mistaken for native skill parity.

## MCP configuration

The team-shared project MCP file is `.mcp.json` at the project root.
Repo mode may compile repository entries from that file and relevant repository settings that enable or disable those entries.

Duplicate server definitions across Claude scopes use whole-entry precedence in this order:

1. local
2. project
3. user
4. plugin
5. claude.ai connector

Repo mode generally sees the project entry only.
It must not invent a local or user override and must retain a diagnostic for unavailable higher-precedence machine state.

Interactive local sessions normally require project-server approval.
Noninteractive `-p`, SDK, and cloud sessions can load project servers without the same interactive prompt.
Static repo analysis cannot select a universal approval state and must label the server `runtime-unverified`.

Claude supports `stdio`, HTTP or streamable HTTP, deprecated SSE, and WebSocket transports.
The Phase 1 shared `McpTransport` contract represents `stdio`, `http`, and `unknown` only.
Until the shared contract is deliberately extended, SSE and WebSocket entries must use `unknown` with an `unsupported` diagnostic rather than being mislabeled as HTTP.

Claude expands `${VAR}` and `${VAR:-default}` expressions at runtime.
PlaybookDiff must preserve those expressions symbolically because the analyzed developer's environment is unknown.
It must never substitute values from the analyzer's own host environment and must never serialize resolved secrets.

A `.mcp.json` entry proves repository configuration only.
It does not prove approval, authentication, connection success, runtime server instructions, or exposed tools, resources, and prompts.
Capabilities must use `known: false` in repo mode.

A dedicated per-server `env` map (as opposed to a `${VAR}` placeholder embedded directly in `args`, which the shared type test already establishes as representable) has no field in the current `EffectiveMcpServer` contract. Discovered during Phase 2 implementation, not anticipated in the Phase 1 contract. The adapter emits an `unsupported` diagnostic naming the server rather than silently dropping the `env` map or widening the shared type without broader evidence that this is the right representation (e.g. whether it should be a flat map, whether values need the same symbolic-placeholder treatment, how it should interact with future local-mode env resolution).

## Provenance and diagnostics

Every effective or candidate item must retain:

- a stable effective identifier
- normalized repository-relative POSIX source paths in repo-mode serialization
- source line ranges when the parser can establish them
- source scope and format
- discovery reason
- startup order or on-demand phase
- resolution strategy and any excluded or shadowed sources
- applicability to the supplied context
- assumptions and uncertainty

The adapter should use diagnostics rather than silent fallback for parse errors, unavailable local layers, external import approval, imports outside the repository, cycles, path-match uncertainty, unsupported nested rules mechanics, settings scope, skill advertisement risk, unsupported skill overrides, unsupported transports, and runtime MCP unknowns.

## Unsupported in v0.1

- managed enterprise configuration
- synced skills
- plugin skills
- plugin MCP
- legacy `.claude/commands` custom commands
- full `skillOverrides` resolution pending the normalized schema decision
- exact path-scoped skill behavior pending fixture verification
- auto memory
- hooks
- permissions
- subagents
- runtime MCP capability discovery
- interactive approval state
- CLI flags
- host embedding settings
- `--add-dir` external directory behavior

Unsupported surfaces must not be silently treated as absent.
When they can affect a supported category, the adapter must emit an appropriate diagnostic or assumption.

## Unresolved semantics

Resolved in Phase 2 (kept here for history, not because they are still open):

- ~~Selection and order when `CLAUDE.md` and `.claude/CLAUDE.md` coexist at one project level~~ - both load, root first; verified via the `InstructionsLoaded` hook (see Startup discovery above).
- ~~The glob anchor for skill `paths` frontmatter~~ - project-root-relative, same matcher as rules; confirmed by official docs.

Still open, and requiring fixture evidence or an explicit shared-schema decision before deterministic implementation:

1. Traversal, ordering, and glob anchoring for a _separately nested_ `.claude/rules/` root (one below `cwd`, independent of the ancestor-chain rules root Phase 2 discovers). Existence is confirmed by documentation; mechanics are not.
2. Whether `.claude/CLAUDE.md` coexistence-loading generalizes to ancestor directories other than the outermost project root - Phase 2 generalizes it there by extension, not by independent verification at each level.
3. Representation of deterministic `skillOverrides` states such as `name-only`.
4. Representation of documented SSE and WebSocket MCP transports in the normalized type system.
5. Representation of a dedicated per-server MCP `env` map in the normalized type system (discovered as a real gap during Phase 2 implementation).
6. Claude Code's native response to an import cycle.
7. Whether a single static `targetPath` fully approximates the relevant lazy-loading state for a session.
8. Resolution of contradictory natural-language instructions because the documentation does not define a mechanical last-wins rule.
9. The exact directory-qualified invocation identifier for a colliding same-name skill. The mechanism and its collision-driven trigger are now confirmed live (see Skills > Discovery above), but the identifier depends on names outside repo-mode visibility, so the adapter cannot predict it from repository state alone.

These are Phase 3 fixture and contract tasks, not permission to infer behavior from implementation-agent intuition.

## Fixture checklist

Implemented and covered by a real filesystem fixture under `packages/harness-claude/test/fixtures/`:

- [x] root CLAUDE.md
- [x] .claude/CLAUDE.md
- [x] root + nested CLAUDE.md
- [x] CLAUDE.local.md (repo-mode exclusion and local-mode inclusion)
- [x] @AGENTS.md import
- [x] recursive import
- [x] import inside code span is ignored
- [x] import inside fenced code is ignored
- [x] mid-document import (order preserved around imports that aren't the whole file)
- [x] path-scoped `.claude/rules`
- [x] unconditional `.claude/rules`
- [x] root skill
- [x] nested skill
- [x] duplicate root/nested skill names
- [x] same-name nested skill cross reference
- [x] project `.mcp.json`
- [x] multiple MCP servers
- [x] environment placeholders in MCP (args-embedded)
- [x] excluded CLAUDE.md
- [x] excluded rule
- [x] unresolved import (missing file)
- [x] outside-repository import
- [x] import cycle defensive behavior
- [x] analysis without targetPath preserves on-demand sources as conditional (instructions, rules, skills)
- [x] both `CLAUDE.md` and `.claude/CLAUDE.md` at one project level
- [x] separately nested `.claude/rules/` directory (existence-detection diagnostic only, per the unresolved traversal mechanics above)
- [x] skill `paths` with and without a target
- [x] project settings loaded only from `<cwd>/.claude/`, no ancestor fallback
- [x] skill advertisement description budget risk
- [x] unsupported MCP transport diagnostic (SSE)
- [x] read-only safety (fixture tree byte-identical before/after `compileClaudeConfig`)

Not implemented in Phase 2 - honest gaps, not silent claims of coverage:

- [ ] external import inside repository but outside `cwd`
- [ ] recursive rule ordering within one rules root (nested subdirectories under one `.claude/rules/`)
- [ ] WebSocket MCP transport (same code path as the SSE case above, but not independently fixture-tested)
- [ ] `.claude/commands` unsupported diagnostic - detection not implemented; a project using only `.claude/commands/` compiles as if it had no legacy commands, rather than emitting a scope diagnostic
- [ ] `skillOverrides` unresolved-schema diagnostic - parsing not implemented at all
