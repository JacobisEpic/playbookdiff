# Deterministic comparison specification

## Status and purpose

Status: Phase 4 deterministic comparison contract.

The comparator consumes two already-compiled `EffectiveAgentConfig` values and returns a provenance-backed `CompatibilityReport`.
It is pure and uses no filesystem, network, environment, Git, adapter, or model access.
Its job is to separate proven equivalence, proven structural divergence, and compatibility that cannot be determined without semantic analysis.

The governing rule is:

```text
textually different != deterministically incompatible
```

The comparator can prove that prose differs.
It cannot prove that differently worded prose conflicts, is equivalent, or has a particular behavioral consequence.
Deterministic Phase 4 therefore does not emit `instruction + conflict` findings.
The `conflict` type is reserved for later semantic comparison or a future structured contradiction that can be proved mechanically.

## Public API and input contract

The public API is:

```ts
compareEffectiveConfigs(
  left: EffectiveAgentConfig,
  right: EffectiveAgentConfig,
): CompatibilityReport
```

The comparator operates only on normalized IR.
It assumes adapters have already enforced repository-relative paths and secret-safe values.
It does not silently repair malformed adapter output.
The returned report retains the original left and right configurations without mutating them or any nested value.

Adapter assumptions and diagnostics are analysis context, not raw diff inputs.
They are not compared item by item.
An entity's normalized `unknown` state can produce an `unknown` finding, but unrelated diagnostics such as unavailable local configuration do not create compatibility noise.

## Stable finding IDs

Finding IDs identify a logical entity, relationship, direction when relevant, and comparison aspect.
They do not identify the current explanation wording or exact divergent value.

The shape is:

```text
<category>:<type>:<readable-logical-key>:<short-sha256-digest>
```

The digest input is a canonical tuple containing only stable logical identifying material.
It excludes absolute host paths, line numbers, explanation prose, array enumeration order, and configured secret values.
For example, an MCP URL change remains the same logical `mcp:different:database` finding because the ID identifies the server's configuration relationship rather than either URL.
Direction is included for one-sided findings so a left-only entity and a right-only entity have different IDs.

Instruction IDs may use a canonical content fingerprint to distinguish multiple one-sided instructions in the same applicability bucket.
The fingerprint is a one-way digest, not instruction text.
MCP environment ID material uses variable names and normalized value kinds only.
Configured redacted values never contribute a secret or resolved value.

Finding IDs remain stable when source lines shift, unrelated entities are added, or evidence wording changes.

## Stable output order

Findings are sorted by:

1. category: `instruction`, `skill`, `mcp`, `other`
2. severity: `high`, `medium`, `low`, `info`
3. finding ID lexicographically

The comparator never relies on filesystem enumeration or input object insertion order for output ordering.

## Evidence

Every divergence or unknown finding includes useful provenance evidence.
A two-sided finding includes evidence from both sides.
A one-sided finding includes evidence from the side that exists.

Instruction excerpts are short and preserve only enough text to identify the compared item.
Skill excerpts contain a name and, when useful, a short description or policy state.
MCP excerpts contain only non-secret structured state such as server name, transport, command, URL, environment variable names, and normalized value kinds.
Configured environment values are always described as redacted and are never exposed in IDs, explanations, evidence, or snapshots.

Finding `left` and `right` details are short, structural, and machine-safe.
They do not predict agent behavior.

## Instruction comparison

### Canonical content

Instruction content canonicalization performs exactly two transformations:

1. CRLF and bare CR line endings become LF.
2. One optional final LF is ignored, while additional trailing blank lines remain meaningful.

No other transformation occurs.
The comparator does not lowercase, collapse internal whitespace, remove punctuation, strip Markdown, reorder sections, fuzzy-match, tokenize, embed, or invoke a model.

### Stage A: exact-content matching

Instructions first match by canonical content without considering source filenames.
This allows identical content in `CLAUDE.md` and `AGENTS.md` to be equivalent.

Duplicate occurrences are sorted and paired by:

1. canonical scope signature
2. load phase
3. effective order
4. normalized source path
5. stable input ID as a final tie-breaker

An exact-content pair with the same applicability is equivalent.
An exact-content pair with different `appliesTo`, `excludedFrom`, or load phase produces a medium `scope-gap` finding.
Numeric order alone does not produce a finding because free-form instruction precedence is not mechanically last-wins.

### Stage B: unmatched applicability buckets

Unmatched instructions are grouped by a canonical applicability signature containing sorted `appliesTo`, sorted `excludedFrom`, and load phase.
Source filename is not part of this logical bucket.

If both sides contain unmatched prose in the same bucket, the bucket produces an informational `unknown` finding.
The comparator has proved that the text differs but has not evaluated semantic compatibility.
If only one side contains instructions in a bucket, each one-sided instruction produces a medium `missing` finding with direction in the finding ID.
When duplicate candidates cannot be paired uniquely, the comparator preserves the ambiguity as `unknown` instead of choosing an arbitrary pairing.

## Skill comparison

### Logical identity

A skill's directory basename is derived from the directory containing its `SKILL.md` path.
The effective skill name is normally the logical key.
If an effective name ends in `:<directory-basename>`, the qualification is removed only when the path corroborates that trailing name.
A colon is never split blindly.

`.claude/skills` and `.agents/skills` path syntax does not create a compatibility difference by itself.
Source paths, `crossReferences`, `metadataSources`, description caps, and aggregate budget constants are provenance or harness mechanics rather than direct compatibility dimensions.

### Groups and duplicate pairing

Skills are grouped by logical key and retained as multisets.
A single left and right member form an unambiguous pair.
Duplicate groups pair only when normalized repository location keys uniquely corroborate every pair after removing the harness-specific `.claude/skills` or `.agents/skills` segment.
If multiple candidates remain equally plausible, the whole logical group produces an informational `unknown` finding.
The comparator never pairs duplicate skills by input array position.

### Compared state

A skill on only one side produces a medium `capability-gap` finding.
Different known discovery states produce a medium `scope-gap` finding.
An unknown discovery or invocation state that prevents a conclusion produces an informational `unknown` finding.

Explicit and implicit invocation are compared together as one capability dimension.
Any known invocation difference produces one medium `capability-gap` finding with both states in the details.
An advertisement difference produces a low `different` finding unless the same invocation-policy difference already explains the hidden or advertised result.
Harness-specific budget constants are ignored.

Descriptions are compared using the minimal text canonicalization.
Different or missing descriptions produce a separate low `different` finding that explicitly says semantic equivalence was not evaluated.
The normalized schema does not contain full skill bodies, so Phase 4 does not compare their semantics.

## MCP comparison

MCP servers match by exact normalized server name with no case folding.
Differently named servers are never paired based on similar commands or URLs.

A server on only one side produces a medium `capability-gap` finding.
For a same-name pair, source path and source format are ignored.
Transport, command, argument order and values, URL, environment references, and known capability metadata are compared.

Known transport, command, argument, or URL differences are combined into one medium `different` configuration finding.
An `unknown` transport prevents a deterministic transport conclusion and produces an informational `unknown` finding rather than a guessed difference.

Environment variables match by exact configured name.
Equal host references and equal symbolic expressions are equivalent.
Different names, kinds, host variable names, or symbolic expressions produce a medium `different` finding.
Two configured redacted values produce an informational `unknown` finding because redaction proves neither equality nor difference.
A configured redacted value versus a host or symbolic reference is a known structural difference.

When both capability records are unknown, no finding is emitted.
When one side is known and the other is unknown, compatibility is unknown.
When both are known, tools, resources, and prompts are compared as sorted sets and missing known capabilities produce a medium `capability-gap` finding.
Phase 4 does not perform runtime discovery.

## Deduplication policy

One root cause produces one finding per comparison aspect.
Explicit and implicit invocation differences share one skill invocation finding.
Transport, command, args, and URL differences share one MCP configuration finding.
Environment and runtime capability differences remain separate because they represent independent concerns.

An advertisement difference is suppressed when the paired invocation-policy difference already explains the same hidden or advertised consequence.
Description differences remain independent because routing metadata can differ even when invocation mechanics also differ.

## Severity defaults

Phase 4 emits no high-severity finding by default.

Medium severity is used for one-sided instructions, missing skills or MCP servers, skill discovery and invocation gaps, MCP transport or endpoint configuration differences, environment differences, and known runtime capability gaps.

Low severity is used for skill description and independent advertisement differences.

Info severity is used for semantic-unknown instruction text, ambiguous duplicate matching, redacted-value uncertainty, unknown normalized states, and other non-actionable uncertainty.

All Phase 4 findings use `confidence = "deterministic"`.
For an `unknown` finding, deterministic confidence means the comparator has mechanically proved that available evidence is insufficient.

## Summary semantics

Finding counts count findings by severity.
Category summaries count logical compared entities rather than raw files or findings.

Each entity has exactly one summary state with this precedence:

```text
divergent > unknown > equivalent
```

Known finding types `missing`, `different`, `capability-gap`, `scope-gap`, and `conflict` make an entity divergent.
An entity with no known divergence but at least one `unknown` result is unknown.
An entity with no compatibility finding is equivalent.

An `informational` finding does not by itself make an entity divergent.
It can accompany an equivalent or unknown entity depending on the underlying comparison state.
The report always includes `instruction`, `skill`, and `mcp` category summaries, including zero counts.

## Intentionally ignored data

The comparator does not directly compare:

- adapter assumptions
- unrelated adapter diagnostics
- provenance path syntax
- source formats
- source line numbers
- instruction numeric order by itself
- skill `crossReferences`
- skill `metadataSources`
- harness-specific skill description limits or aggregate budget constants
- runtime MCP state when both sides explicitly say capabilities are unknown

These values remain available in the retained configurations and evidence but are not automatically repository compatibility dimensions.

## Examples

### Exact instruction parity

```text
Claude CLAUDE.md:
Run tests before pushing.

Codex AGENTS.md:
Run tests before pushing.

Result: equivalent
```

Different native filenames do not matter when canonical content and applicability match.

### Semantic unknown

```text
Claude:
Run tests before pushing.

Codex:
Make sure the test suite passes before you push.

Result: unknown in deterministic mode
```

The text differs, but equivalence or conflict requires the later semantic phase.

### Scope gap

```text
Claude:
The nested API instruction is active on target access.

Codex:
The same nested instruction is not discovered when cwd is the repository root.

Result: scope-gap
```

### Skill capability gap

```text
Claude deploy skill:
implicit = blocked

Codex deploy skill:
implicit = allowed

Result: capability-gap
```

### MCP gap

```text
Claude:
database MCP configured

Codex:
database MCP absent

Result: capability-gap
```

## Limitations

Phase 4 does not determine semantic instruction equivalence, prose conflict, restrictiveness, or behavioral consequence.
It does not compare full skill bodies because the current normalized schema does not contain them.
It does not reconstruct hidden machine configuration, resolve redacted secrets, connect to MCP servers, or infer runtime capabilities.
It does not implement CLI commands, Git revision comparison, suppressions, configuration synchronization, AI, CI, or a web interface.

Diagnostics without typed entity linkage cannot always be assigned safely to a specific comparison entity.
The comparator therefore prefers normalized `unknown` state and avoids promoting unrelated adapter diagnostics into findings.
