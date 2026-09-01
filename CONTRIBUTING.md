# Contributing to PlaybookDiff

Thank you for helping improve PlaybookDiff.

## The one rule that matters

PlaybookDiff's value is that its findings can be trusted, which means it must never assert harness behavior it cannot establish.

Harness behavior must be supported by current official documentation, or by a minimal reproducible fixture against the real harness.
When documentation and observed behavior disagree, or when official pages conflict with each other, document the discrepancy and preserve an explicit `unknown` rather than picking the more convenient reading.

An `unknown` that is honest is a better contribution than a guess that happens to be right.

## Development setup

Node.js 24 (24.11.0 or newer, within 24.x) and the pnpm version pinned in `package.json`.

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm fmt:check
pnpm test
pnpm build
```

If your change touches `packages/core`, `packages/cli`, or either harness package, the committed GitHub Action bundle also has to be rebuilt, because it vendors them:

```sh
pnpm action:verify-bundle
```

That rebuilds the bundle and fails if the committed one was stale, so run it before opening a pull request.

## Fixture philosophy

Discovery behavior is tested against real directory trees under `packages/*/test/fixtures/`, analyzed by the production adapters.
A unit test that mocks the filesystem proves the code does what it says; a fixture proves the code models the harness.

Fixtures should be:

- **Minimal.** Exactly the files needed to demonstrate one semantic, and nothing else.
- **Neutral.** Invented content such as `Run the project tests before committing.` A fixture demonstrates a rule; it is not a place to memorialize where you found the bug.
- **Named for the semantic**, not for the source. `imports/unresolved-inline`, not `bug-from-some-repo`.

**Never copy proprietary or private configuration into this repository**, and do not copy distinctive configuration out of someone else's project either - including public ones. If a real repository motivated the change, reproduce the semantic with invented content. See [validation](docs/validation.md#privacy).

## Adding a harness-semantic regression test

When you fix a discovery or comparison defect:

1. **Reproduce it minimally first.** Build the smallest fixture that fails, before touching the implementation. If you cannot reproduce it in a fixture, you do not yet understand it.
2. **Decide which class it belongs to** - discovery, applicability, equivalence, one-sided coverage, non-activation, provenance, containment, or regression semantics. The classes are described in [validation](docs/validation.md#classes-of-regression-test).
3. **Write the test so it states the semantic**, in a comment, in terms of what the harness does. A future reader needs to know whether a failure means the code broke or the harness changed.
4. **Add the mirror case.** A fix that makes something a finding usually needs a paired test proving the neighboring case is still _not_ a finding. False positives on mirrored configuration are the most damaging failure mode this tool has, because they train people to ignore CI.
5. **Cross-harness behavior belongs in a cross-harness test**, not two adapter tests that happen to agree.

## Architectural boundaries

- Harness-specific discovery and resolution live in that harness's adapter package. Frontmatter conventions, glob anchoring, and discovery order are the adapter's knowledge, not a caller's.
- Normalized cross-harness concepts live in `packages/core`. The comparator is pure: no filesystem, network, environment, Git, or model access.
- Provenance and explicit uncertainty are preserved for every meaningful result. A silent fallback is a bug even when it produces the right answer.

## Pull requests

- Keep changes within the current product scope. New harnesses, semantic comparison, and hosted services are out of scope.
- Never execute code from an analyzed repository - including hooks, scripts, and package commands.
- Explain new assumptions, unsupported states, and provenance behavior in the pull request description.
- If you added a diagnostic, say what a user is meant to do about it.

## Reporting a suspected harness mismatch

If PlaybookDiff models a harness incorrectly, please report it even if you cannot fix it.
A report is actionable when it has a minimal repository layout, the exact command and its `--json` output, what you expected instead, and a link to official documentation or a reproducible observation supporting that expectation.

For suspected vulnerabilities, follow [SECURITY.md](SECURITY.md) instead - not a public issue.
