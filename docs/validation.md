# Validation

## Why this document exists

PlaybookDiff makes deterministic claims about repository configuration.
A tool that fails CI needs to be able to say how it knows it is right, and where it stops knowing.

This describes how the analyzer has been validated, what that validation covers, and - more importantly - what it does not prove.
It is written so that someone deciding whether to trust PlaybookDiff in their own CI can judge the evidence rather than the confidence of the claim.

## What is tested, and how

Validation runs at three levels, each answering a different question.

### Fixture tests

Real directory trees under `packages/*/test/fixtures/`, analyzed by the production adapters.

These lock harness discovery semantics: which files a harness finds, in what order, with what applicability, and what it deliberately refuses to conclude.
A fixture is a claim about a harness, so a fixture is only added when current official documentation or a reproducible observation against the real harness supports it.
Where neither does, the fixture asserts an explicit `unknown` and a diagnostic instead of a guessed answer.

### Comparator tests

Pure tests over the normalized representation, with no filesystem involved.

These lock the rules that decide when two configurations are equivalent, divergent, or undetermined - including the rules that keep the comparator from claiming more than it can prove.

### Real-repository validation

The production CLI has been run end to end against public open-source repositories with substantial checked-in agent configuration, at pinned commits, and every emitted finding was manually audited against the repository's actual files and the harnesses' documented behavior.

The audit asked, for each finding: is the underlying effective configuration genuinely different, is the direction right, is the scope right, is the evidence right, and would failing CI on this be defensible?
It also looked for the opposite error, reading the configuration directly and asking whether any deterministic difference had been missed.

Defects found this way were reproduced as minimal generic cases, fixed in the engine, and locked with regression tests.
Those tests use invented neutral content; no external repository's configuration was copied into this repository.

## Coverage

Real-repository validation has exercised these classes of configuration:

- root instruction asymmetry, including one side carrying substantive guidance the other only points at
- nested instruction files at several depths, on both harnesses
- instruction imports that resolve, including relative imports that leave the containing directory
- text that resembles import syntax but resolves to nothing, such as a scoped package name in prose
- configuration shared between harnesses by symlink, at both file and directory level
- path-scoped rules, with matching and deliberately non-matching work targets
- skills, including invocation policy expressed in harness-specific frontmatter
- MCP server definitions across both harnesses' native configuration formats
- launch-directory-sensitive discovery, where the same repository compiles differently depending on where the agent starts
- work-target-sensitive discovery, where configuration activates only in relation to a path being worked on
- real Git history containing genuine agent-configuration changes, compared as revision pairs
- the GitHub Action, exercised as the committed bundle against real repository pairs

Repositories were selected for the semantics their configuration exercises, not for prominence.

## Classes of regression test

Every engine defect found during validation has a permanent test in one of these classes:

| Class                | What it locks                                                                         |
| -------------------- | ------------------------------------------------------------------------------------- |
| Discovery            | Which files a harness finds for a given repository, launch directory, and work target |
| Applicability        | The repository-root-relative scope a discovered item governs                          |
| Equivalence          | That genuinely mirrored configuration produces no finding                             |
| One-sided coverage   | That a real gap stays actionable and cannot be absorbed by unrelated prose            |
| Non-activation       | That configuration which should not apply produces no finding                         |
| Provenance           | That a finding points at the path where a harness actually reads the file             |
| Containment          | That analysis refuses to follow a path outside the repository, with a diagnostic      |
| Regression semantics | That pre-existing divergence never becomes an introduced regression                   |

The equivalence and non-activation classes matter most.
A compatibility checker that reports differences nobody can act on is worse than no checker, because it trains people to ignore it.

## Read-only verification

Every real-repository run is bracketed by a check that the analyzed repository is byte-identical afterwards: `HEAD`, current branch, index, tracked and untracked files, worktree list, remotes, and commit tree hash.

This is verification, not assertion.
The properties it confirms are described in [the security model](security.md).

## Privacy

External repositories are used only as read-only validation inputs.

Findings about a specific external repository are not published, and no external project is characterized here or elsewhere on the basis of this analysis.
A compatibility finding describes a deterministic configuration difference under stated assumptions; it is not a defect report about the project it was observed in, and much of what PlaybookDiff reports is intentional on the maintainers' part.

Where real-world validation motivated an engine change, the change is documented and tested through invented neutral fixtures that demonstrate the semantics, not through copies of anyone's configuration.

## What validation does not prove

Passing validation does not mean any of the following:

- **That two agents will behave the same.** PlaybookDiff compares configuration, not behavior. Identical configuration does not make different models act alike, and this tool never claims it does.
- **That differently worded prose means the same thing.** Text that differs is reported as undetermined, never as equivalent and never as conflicting. Establishing semantic equivalence is outside the deterministic engine entirely.
- **That a configured capability works.** A configured MCP server proves a repository configured it - not that it is reachable, authenticated, approved, or exposing any particular tools.
- **That the analysis describes a specific developer's session.** Results describe repository-defined configuration under stated assumptions. User-level, machine-level, and organization-managed configuration are not visible to it.
- **That coverage is complete.** Analysis covers the launch directory and work targets it was given. A result is a statement about what was analyzed, which is why runs report the contexts they covered.
- **That unsupported harness surfaces are absent.** Where an unsupported surface could affect a supported result, it produces a diagnostic rather than silence. See [known limitations](limitations.md).

## Reporting a suspected mismatch

If PlaybookDiff's model of a harness looks wrong, that is worth reporting even without a fix.
The most useful report contains a minimal repository layout that reproduces it, the exact command and its `--json` output, what you expected, and a link to the official documentation or a reproducible observation supporting that expectation.

See [CONTRIBUTING](../CONTRIBUTING.md) for how harness semantics are established and changed.
