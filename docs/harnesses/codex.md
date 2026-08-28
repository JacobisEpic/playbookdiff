# Codex harness specification

## Verification record

Last verified: 2026-08-28.

Status: Phase 1 contributor specification.
No Codex adapter implementation exists yet.

This specification is based on current official Codex documentation, especially:

- [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic)
- [Advanced Configuration](https://learn.chatgpt.com/docs/config-file/config-advanced)
- [Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Sample Configuration](https://learn.chatgpt.com/docs/config-file/config-sample)
- [Build skills](https://learn.chatgpt.com/docs/build-skills)
- [Model Context Protocol](https://learn.chatgpt.com/docs/extend/mcp)
- [Slash commands in Codex CLI](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
- [Codex manual](https://developers.openai.com/codex/codex-manual.md)

Official documentation is normative for documented behavior.
Reproducible observations from the real Codex harness are the next source of evidence.
Where official pages conflict or omit a mechanical detail, the adapter must produce an explicit diagnostic until a fixture establishes the behavior.

## Adapter purpose

The future Codex adapter will answer:

> Given a repository and launch directory, which supported repository-defined instructions, skills, and MCP servers can Codex discover under documented rules, and where did each value come from?

It will compile Codex-specific discovery into the shared `EffectiveAgentConfig` representation.
It will not compare harnesses, execute repository code, connect to MCP servers, or infer hidden machine state.

The result is the effective repository-defined configuration under stated assumptions.
It is not the total machine-effective configuration for a particular developer.

## Analysis context

The adapter receives an `AnalysisContext` with four independent values.

- `repositoryRoot` is the logical project boundary supplied to PlaybookDiff.
- `cwd` is the directory from which Codex is assumed to start.
- `targetPath` is an optional path the agent is expected to work on.
- `mode` is `repo` or `local`.

`cwd` and `targetPath` are not interchangeable.
Codex builds its project instruction chain only through `cwd`.
A deeper `targetPath` does not extend that startup chain.

Codex normally identifies a project root using `.git`, but user configuration can change `project_root_markers` or make `cwd` the effective root.
Repo mode cannot see those user values.
It therefore assumes that the supplied `repositoryRoot` matches Codex's project root and records that assumption.

## Analysis modes

### Repo mode

Repo mode includes only reproducible repository-visible configuration and documented built-in defaults.
It excludes or marks unknown:

- `$CODEX_HOME/AGENTS.override.md` and `$CODEX_HOME/AGENTS.md`
- user and profile configuration
- CLI flags and `--config` overrides
- system configuration
- managed requirements and organization policy
- actual project trust state
- user, admin, and system skills
- user skill-disable configuration
- authentication and approval history
- runtime MCP initialization, tools, resources, prompts, and server instructions
- cloud-specific environment behavior

Repo mode assumes that applicable project `.codex/` layers are trusted so their repository-defined values can be compiled.
The assumption applies to trust-gated `.codex/` configuration.
Current documentation does not state that project trust suppresses `AGENTS.md` or repository `.agents/skills`, so the adapter must not apply that trust gate to those surfaces without evidence.

Repo-mode output must say `repository-configured` and `runtime-unverified` for MCP entries.
It must not describe the result as a developer's complete configuration.

### Local mode

Local mode may eventually include accessible machine-local configuration.
It still cannot assume knowledge of server-managed policy, remote authentication, or runtime MCP behavior.
Every local source must retain its scope and provenance so it cannot be mistaken for reproducible repository state.

Phase 1 defines the mode distinction but does not implement local discovery.

## Project instructions

### Global instruction layer

In local mode, Codex checks `$CODEX_HOME/AGENTS.override.md` first and otherwise `$CODEX_HOME/AGENTS.md`.
It uses the first nonempty file at that level.
Repo mode excludes this layer and emits a `local-config-unavailable` diagnostic when completeness would otherwise be implied.

### Project instruction chain

Codex constructs the project instruction chain once per run or launched TUI session.
Starting at `repositoryRoot`, it walks directory by directory to `cwd`, inclusive.

At each directory it selects at most one nonempty instruction source in this order:

1. `AGENTS.override.md`
2. `AGENTS.md`
3. each configured `project_doc_fallback_filenames` entry in array order

An override replaces the regular file only at the same directory level.
It does not erase instruction sources already selected from ancestor directories.

Selected files are concatenated from root to `cwd` with blank lines between them.
Broader instructions therefore appear first and more specific instructions appear later.
The adapter must preserve this order in `EffectiveInstruction.order` and provenance.

Codex stops project instruction discovery at `cwd`.
For this layout:

```text
repo/
├── AGENTS.md
└── apps/
    └── api/
        └── AGENTS.md
```

`cwd = repo/` loads only the root file, even when `targetPath = repo/apps/api/file.ts`.
`cwd = repo/apps/api/` loads the root file followed by the API file.

This boundary is intentionally different from Claude Code's nested on-demand instruction behavior.
The normalized model must expose the resulting scope gap rather than erase it.

### Fallback filenames

The documented built-in default for `project_doc_fallback_filenames` is an empty array.
When an applicable, trusted repository config provides fallback filenames, the future adapter may use them for the directories in the root-to-`cwd` chain.
Repo mode must not invent fallback names from unavailable user configuration.

### Project instruction byte budget

The documented default for `project_doc_max_bytes` is 32 KiB, or 32,768 bytes.
Applicable repository configuration may replace that default when the value is known.

The official pages currently conflict on the budget's exact scope.
The dedicated `AGENTS.md` page describes a combined-chain limit, while Advanced Configuration describes the option as a per-file limit and the reference does not resolve the distinction.
The documentation also does not specify partial-last-file behavior, UTF-8 boundary handling, or whether inserted separators count toward the limit.

Until a real Codex fixture establishes those mechanics, the adapter must not claim exact truncation behavior.
It must preserve the candidate chain, emit an `unresolved` diagnostic when the budget could matter, and record the configured or default budget as an assumption.

## Project configuration

Codex reads `.codex/config.toml` layers from the project root through `cwd` for trusted projects.
When multiple layers define the same documented scalar key, the closest layer to `cwd` wins.
Relative paths resolve from the `.codex/` directory containing the applicable file.

The documented overall precedence from highest to lowest is:

1. CLI flags and `--config` overrides
2. project `.codex/config.toml` layers, with the closest applicable layer winning
3. the selected profile file
4. user configuration
5. system configuration
6. built-in defaults

Repo mode sees project layers and built-in defaults only.
It must retain diagnostics for all unavailable higher or external layers that could materially affect a supported surface.

Only configuration needed to resolve instructions, skills, or MCP belongs in the v0.1 adapter.
The presence of `.codex/config.toml` does not authorize comparison of unrelated settings.

## Skills

### Discovery

For repository skills, Codex scans `.agents/skills/` in each directory from `cwd` upward through `repositoryRoot`.
It does not scan arbitrary descendants below `cwd` merely because `targetPath` is deeper.

The future adapter will discover each `SKILL.md` using real filesystem behavior.
Codex documents support for symlinked skill directories, but repo mode must diagnose a target outside the repository rather than silently importing non-reproducible content.

Same-name skills in separate scanned locations remain separate entries.
They are not automatically merged and can both appear in selectors.
An effective skill identity must include its source path as well as its name.

User configuration can disable a skill.
Because repo mode cannot see invisible user settings, a repository-discovered skill is not proof that the skill is runtime-active for every user.
The adapter must represent that limitation explicitly instead of converting discovery into a single enabled boolean.

### Invocation

A skill is explicitly invocable by default.
Optional `agents/openai.yaml` metadata can set `policy.allow_implicit_invocation: false`.
That value maps to implicit invocation `blocked` while explicit invocation remains `allowed`.
The documented default is implicit invocation `allowed`.

Repository discovery and invocation policy are separate facts.
Both must retain the source of the `SKILL.md` and any metadata file that contributed to resolution.

### Advertisement

Codex initially exposes skill name, description, and path metadata to the model.
The documented aggregate metadata budget is at most 2 percent of the model context window, with an 8,000-character fallback when the context window is unknown.

When the listing exceeds the budget, Codex shortens descriptions first and may then omit entries with a warning.
The official documentation does not define exact accounting, ordering, or omission selection.
Hidden user, admin, or system skills can also consume budget that repo mode cannot observe.

The adapter may therefore record:

```text
aggregateBudget.maxContextFraction = 0.02
aggregateBudget.fallbackChars = 8000
```

When repository metadata could exceed the known budget, it must use `advertisement.state = "budget-risk"`.
It must not fabricate which skill will be shortened or omitted.

## MCP configuration

Applicable, trusted project `.codex/config.toml` files can define repository MCP servers under `mcp_servers` tables.
Static analysis may compile configured names, transport settings, commands, arguments, URLs, and symbolic environment references.

Environment variable names and placeholders must remain symbolic.
PlaybookDiff must never resolve repository MCP secrets from its own host environment or serialize secret values.

A configured table proves only that a server is repository-configured under the analyzed assumptions.
It does not prove that the server is enabled after all invisible layers, authenticated, reachable, initialized, approved by managed policy, or exposing particular capabilities.

Codex may read an MCP server's own instructions during runtime initialization and use them alongside its tools.
Repo analysis does not connect to servers and therefore cannot compare those runtime instructions.
Capabilities must use `known: false` unless supported evidence comes from a later authorized runtime mode.

### Duplicate server names across layers

The official configuration documentation establishes overall layer precedence but does not specify field-level merge behavior when the same `mcp_servers.<name>` table appears in multiple `.codex/config.toml` layers.
It is unknown whether the nearest table replaces the ancestor table, deep-merges with it, or resolves fields independently.

The future adapter must preserve both provenances and emit an `unsupported` or `unresolved` diagnostic.
It must not implement a field-merge strategy until a real Codex fixture verifies the behavior.
The documented `/debug-config` and `/mcp` commands can provide evidence for that fixture in Phase 3.

## Provenance and diagnostics

Every effective or candidate item must retain:

- a stable effective identifier
- normalized repository-relative POSIX source paths in repo-mode serialization
- source line ranges when the parser can establish them
- source scope and format
- discovery reason
- root-to-`cwd` order or skill scan location
- resolution strategy and any shadowed sources
- applicability to the supplied context
- assumptions and uncertainty

The adapter should use diagnostics rather than silent fallback for parse errors, unavailable local layers, trust assumptions, instruction budget risk, outside-repository symlinks, runtime MCP unknowns, and unresolved duplicate MCP tables.

## Unsupported in v0.1

- global `$CODEX_HOME` instructions in repo mode
- CLI flags and one-off configuration overrides
- profiles in repo mode
- user, system, admin, and managed configuration
- actual project trust state
- user, admin, system, and bundled skills
- user skill-disable settings
- hooks
- permissions
- subagents
- plugins
- runtime MCP capability discovery
- authentication and approval state
- runtime MCP server instructions
- cloud-specific environment behavior

Unsupported surfaces must not be silently treated as absent.
When they can affect a supported category, the adapter must emit an appropriate diagnostic or assumption.

## Unresolved semantics

The following items require fixture evidence before deterministic implementation:

1. The exact scope and truncation mechanics of `project_doc_max_bytes` because current official pages conflict.
2. Field-level resolution for duplicate MCP server tables across project config layers.
3. Whether `skills.config.path` consistently names a skill directory or its `SKILL.md`, because current reference prose and examples differ.
4. Project-root bootstrapping when `project_root_markers` itself appears only in a project config layer.

These are Phase 3 fixture requirements, not permission to guess during implementation.

## Fixture checklist

- [ ] root AGENTS.md
- [ ] nested AGENTS.md
- [ ] nested AGENTS.override.md
- [ ] root AGENTS.override.md
- [ ] fallback filename
- [ ] instruction byte limit
- [ ] different cwd values
- [ ] root `.agents/skills`
- [ ] nested `.agents/skills`
- [ ] duplicate skill names
- [ ] root `.codex/config.toml`
- [ ] nested `.codex/config.toml`
- [ ] project MCP configuration
- [ ] duplicate MCP server across layers marked unresolved until verified
- [ ] trusted-project assumption
- [ ] repo-mode missing user config diagnostic

Additional verification cases identified from current documentation:

- [ ] configured project-root marker changes
- [ ] empty instruction file is skipped
- [ ] configured fallback filename order
- [ ] symlinked repository skill
- [ ] skill symlink outside repository
- [ ] `allow_implicit_invocation: false`
- [ ] skill advertisement budget risk
- [ ] symbolic MCP environment reference remains unresolved
