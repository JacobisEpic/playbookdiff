# Claude Code harness specification

## Verification record

Last verified: 2026-08-28.

Status: Phase 1 contributor specification.
No Claude Code adapter implementation exists yet.

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

Phase 1 defines the mode distinction but does not implement local discovery.

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

Current official documentation does not establish what happens when both `CLAUDE.md` and `.claude/CLAUDE.md` exist at the same project level.
The adapter must preserve both candidate sources and report the ambiguity until a real fixture establishes selection or order.

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

Path matching must be isolated behind a Claude-specific matcher and verified with real fixtures.
The adapter must preserve each rule file, frontmatter source, source position, matching reason, and on-demand state.

The kickoff contract intentionally limited recursion to the relevant project `.claude/rules/` directory and prohibited scanning arbitrary nested rule roots without fixture evidence.
Current official documentation now describes `.claude/rules/` directories in descendant subtrees as on-demand sources.
The exact traversal order and glob anchor for separately nested rule roots remain unspecified.

Phase 2 must therefore verify the smallest real nested-rules fixture before broadening deterministic discovery.
Until that fixture exists, the adapter specification treats arbitrary descendant rule roots as documented candidates with unresolved mechanics, not as silently supported or silently absent.
This avoids both an obsolete categorical exclusion and an unverified generalized traversal algorithm.

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
The root variant retains its unqualified name, while a nested variant can receive a directory-qualified identity.
The adapter must preserve every variant separately and use `crossReferences` to relate same-name variants when appropriate.

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

Current skill frontmatter also supports `paths` globs that condition automatic activation.
The Phase 1 type contract has no explicit conditional invocation state or structured skill scope.
For a concrete matching target, the adapter can resolve implicit invocation to allowed or blocked with provenance.
Without a target, it must use `unknown` plus a diagnostic rather than claiming unconditional invocation.
Before Phase 2 implementation, a fixture must establish path anchoring and whether the normalized schema needs a dedicated conditional state.

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

The following items require fixture evidence or an explicit shared-schema decision before deterministic implementation:

1. Selection and order when `CLAUDE.md` and `.claude/CLAUDE.md` coexist at one project level.
2. Traversal, ordering, and glob anchoring for separate descendant `.claude/rules/` roots.
3. The glob anchor and lazy-loading behavior for skill `paths` frontmatter.
4. Representation of deterministic `skillOverrides` states such as `name-only`.
5. Representation of documented SSE and WebSocket MCP transports in the normalized type system.
6. Claude Code's native response to an import cycle.
7. Whether a single static `targetPath` fully approximates the relevant lazy-loading state for a session.
8. Resolution of contradictory natural-language instructions because the documentation does not define a mechanical last-wins rule.

These are Phase 2 fixture and contract tasks, not permission to infer behavior from implementation-agent intuition.

## Fixture checklist

- [ ] root CLAUDE.md
- [ ] .claude/CLAUDE.md
- [ ] root + nested CLAUDE.md
- [ ] CLAUDE.local.md
- [ ] @AGENTS.md import
- [ ] recursive import
- [ ] import inside code span is ignored
- [ ] import inside fenced code is ignored
- [ ] path-scoped `.claude/rules`
- [ ] unconditional `.claude/rules`
- [ ] root skill
- [ ] nested skill
- [ ] duplicate root/nested skill names
- [ ] same-name nested skill cross reference
- [ ] project `.mcp.json`
- [ ] multiple MCP servers
- [ ] environment placeholders in MCP
- [ ] excluded CLAUDE.md
- [ ] excluded rule
- [ ] unresolved external import
- [ ] import cycle defensive behavior
- [ ] analysis without targetPath preserves on-demand sources as conditional

Additional verification cases identified from current documentation:

- [ ] both `CLAUDE.md` and `.claude/CLAUDE.md` at one project level
- [ ] external import inside repository but outside `cwd`
- [ ] separately nested `.claude/rules/` directory
- [ ] recursive rule ordering
- [ ] skill `paths` with and without a target
- [ ] project settings loaded only from `<cwd>/.claude/`
- [ ] skill advertisement description budget risk
- [ ] `.claude/commands` produces an unsupported diagnostic
- [ ] `skillOverrides` produces an unresolved schema diagnostic
- [ ] SSE MCP transport produces an unsupported diagnostic
- [ ] WebSocket MCP transport produces an unsupported diagnostic
