# Scope and limitations

This is the single place to find out what PlaybookDiff supports, what it deliberately refuses to conclude, and what it does not look at.

Everything here reflects the current implementation.
Where documentation and behavior could drift apart, the behavior is fixture-tested; see [validation](validation.md).

## Supported semantics

| Area                         | Claude Code                                                                                       | Codex                                                                                                                         | Comparison                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Root instructions            | `CLAUDE.md`, `.claude/CLAUDE.md`                                                                  | `AGENTS.md`, `AGENTS.override.md`                                                                                             | Deterministic                                                                        |
| Nested instructions          | Discovered under the launch directory eagerly, and below it on demand toward a work target        | Discovered from the project root through the launch directory only                                                            | Deterministic                                                                        |
| Instruction imports          | `@path` imports, parsed as Markdown, resolved within the repository                               | No documented import mechanism; a path mentioned in prose delivers nothing                                                    | Deterministic                                                                        |
| Instruction content          | Preserved verbatim; compared by exact canonical content                                           | Same                                                                                                                          | Exact match is equivalence; differing prose is undetermined                          |
| Instruction ordering         | Preserved with provenance                                                                         | Preserved with provenance                                                                                                     | Numeric order alone is never a finding                                               |
| Path-scoped rules            | `.claude/rules/**` with optional `paths:` globs, anchored to the repository root                  | Not a Codex mechanism                                                                                                         | Deterministic where a work target resolves applicability                             |
| Skills                       | `.claude/skills/*/SKILL.md`, including `disable-model-invocation`, `user-invocable`, and `paths:` | `.agents/skills/*/SKILL.md`, including `agents/openai.yaml` invocation policy                                                 | Structural: presence, discovery state, invocation policy, advertisement, description |
| Skill bodies                 | Not compared                                                                                      | Not compared                                                                                                                  | Out of scope; the normalized model holds no skill body                               |
| MCP servers                  | `.mcp.json`                                                                                       | `mcp_servers` tables in `.codex/config.toml`                                                                                  | Structural: name, transport, command, ordered arguments, URL, environment references |
| MCP secrets                  | Preserved symbolically, never resolved                                                            | Preserved symbolically, never resolved                                                                                        | Two redacted values are undetermined, never equal                                    |
| MCP runtime capabilities     | Unknown                                                                                           | Unknown                                                                                                                       | Not claimed                                                                          |
| Discovery-affecting settings | `claudeMdExcludes` from the launch directory's `.claude/settings.json`                            | `project_doc_fallback_filenames`, `project_doc_max_bytes`, `project_root_markers` from applicable `.codex/config.toml` layers | Only where they change a supported result                                            |

## What the model deliberately keeps apart

These distinctions are load-bearing. Collapsing any of them would make results easier to read and wrong.

- **Launch directory is not work target.** Where an agent starts and what it is working on are independent, and the two harnesses respond to them differently. A result is always relative to both.
- **Repository-defined is not machine-effective.** Analysis describes what a repository configures, under stated assumptions - not the total configuration any particular developer's machine produces.
- **Configured is not available.** A server or skill appearing in configuration proves configuration, not that it is enabled, authenticated, reachable, or approved.
- **Different text is not incompatible.** The comparator can prove prose differs. It cannot prove differing prose conflicts, and it does not try.
- **Unknown is a result.** Where evidence is insufficient, that is reported as an informational unknown, which is never a CI failure. An unknown means the analyzer mechanically established that it cannot decide - not that it did not look.

## Not supported

Nothing below is silently treated as absent.
Where an unsupported surface could affect a supported result, analysis emits a diagnostic instead of quietly ignoring it.

### Intentionally out of scope

These are not planned for the deterministic engine, because they cannot be decided from repository files:

- semantic equivalence of differently worded prose, and any claim that two agents behave alike
- runtime MCP capability discovery: connecting to a server, listing its tools, resources, or prompts, or reading server-supplied instructions
- authentication, approval history, and interactive trust state
- executing anything from an analyzed repository, including hooks, scripts, and skill code
- hooks, permissions, subagents, and plugin systems as compatibility dimensions
- user-level, machine-level, and organization-managed configuration outside the repository
- CLI flags, one-off configuration overrides, and profile selection

### Unsupported in the current version

Real surfaces that exist but are not yet modeled:

- `.claude/commands` legacy custom commands; a repository using only these compiles as if it had none
- `skillOverrides` settings; not parsed, so a forced skill state is not reflected
- full `CLAUDE.local.md` handling beyond exclusion from repository-mode results with a diagnostic
- Claude Code plugin skills and plugin-supplied MCP servers
- symlinked directories inside a rules root, which are not recursed into
- launch directories are never derived automatically; automatic context derivation varies the work target only

### Unknown because documentation is ambiguous

These stay unknown deliberately. Resolving them by guessing would be worse than leaving them open:

- traversal order and glob anchoring for a rules directory nested below the launch directory, independent of the ancestor-chain rules root; its existence is documented, its mechanics are not
- the exact scope and truncation behavior of the Codex project-instruction byte budget, where official pages currently conflict on whether it is per file or per chain
- field-level resolution when the same MCP server name appears in more than one configuration layer; whether the nearest table replaces, deep-merges, or resolves per field is unstated
- SSE and WebSocket MCP transports, which are documented for Claude Code but have no representation in the normalized transport model, so they compile as unknown with a diagnostic
- the directory-qualified identifier for a colliding same-name skill, which depends on names outside repository-mode visibility
- whether a single static work target adequately approximates a whole interactive session's lazy loading

## Coverage boundaries in CI

A run reports the contexts it analyzed, and that report is the honest bound on its result.

By default the GitHub Action derives contexts from a pull request's changed paths, so nested configuration under what the pull request touched is covered.
Two boundaries remain:

- **Launch directory.** A run models one launch directory. In a repository where developers start their agent inside a subdirectory, configuration that only that subtree's launch directory reaches is covered by running with `cwd` set to it.
- **Very large pull requests.** Derived contexts are bounded. When a pull request touches more distinct configuration scopes than the bound, the run says how many it did not analyze rather than implying full coverage.

See [the GitHub Action reference](github-action.md) for both.

## Reporting a gap

A surface that is missing, or modeled incorrectly, is worth reporting even without a fix.
See [validation](validation.md#reporting-a-suspected-mismatch) for what makes a report actionable, and [CONTRIBUTING](../CONTRIBUTING.md) for how harness semantics are established.
