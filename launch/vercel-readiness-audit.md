# Vercel OSS readiness audit

> **Historical process document.**
> Written on a pre-merge branch, before the GitHub Action work and this repository's website work were on `main` together.
> That reconciliation has since happened, so statements below about pending integration, separate branches, and superseded test totals describe a state that no longer exists.
> For current product facts see [`README.md`](../README.md), [`docs/limitations.md`](../docs/limitations.md), and [`docs/validation.md`](../docs/validation.md).

Audit date: August 29, 2026.
Program terms and live repository visibility, description, homepage, topics, stars, forks, license, and release status rechecked on August 30, 2026.
Contributor counts remain the August 29 snapshot; no new usage measurements are implied.
Code baseline: `1bb33848fcd0f64ce9e6cdc9dcd380b6aef0b06b`.
Verdict: credible technical foundation, but not ready to submit while the repository is private.

## Verified criteria and gaps

Criteria and early-stage eligibility were checked on the [live official Vercel page](https://vercel.com/open-source-program), not inferred from older search snippets.

| Criterion                           | Current state                                     | Evidence                                                        | Gap and recommended action                                                              |
| ----------------------------------- | ------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Open source and actively maintained | MIT license exists; repository remains private.   | `LICENSE`, baseline commits, GitHub `isPrivate: true`.          | Blocker: owner must approve public visibility after a privacy/security review.          |
| Hosted or intended for Vercel       | Standalone Next.js site prepared.                 | `website/`, independent lockfile and deployment README.         | Deploy after integration and verify the real production URL.                            |
| Impact or growth potential          | Substantial implementation; no verified adoption. | CLI and comparator code, fixture tests, Git diff specification. | Publish usable examples and track real external feedback.                               |
| Code of Conduct                     | Present.                                          | `CODE_OF_CONDUCT.md`.                                           | Verify private reporting works; do not equate a document with an established community. |
| Credits used for the OSS project    | Concrete project-only plan drafted.               | Application package.                                            | Owner should confirm usage boundaries and review billing monthly.                       |

The live page welcomes projects at all stages and also describes impact, engagement, and broader ecosystem contribution as evaluation considerations.
It shows a September 13 summer-cohort deadline and $3,600 over three years; no exact deadline timezone was verified.
Recheck those terms immediately before applying.

## Repository metadata snapshot

Read-only GitHub queries returned:

| Signal                                        | Observed value                    |
| --------------------------------------------- | --------------------------------- |
| Visibility                                    | Private                           |
| Description                                   | Empty                             |
| Homepage                                      | Empty                             |
| Topics                                        | None returned                     |
| Stars                                         | 0                                 |
| Forks                                         | 0                                 |
| Listed contributors                           | One: repository owner             |
| External contributors                         | None in returned contributor list |
| GitHub releases                               | None returned                     |
| Baseline tags                                 | None                              |
| License metadata                              | MIT                               |
| Package downloads, active users, site traffic | Not measured or unavailable       |

These are a dated internal baseline, not launch achievements.
The public website deliberately contains no traction counters.

## Product evidence

| Claim                                      | Baseline evidence                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `check`, `explain`, and `diff` exist       | `packages/cli/src/cli.ts`, command implementations, `docs/cli.md`.                      |
| Exact two-revision regression analysis     | `docs/git-diff.md`, `packages/core/src/diff/report-delta.ts`.                           |
| Source provenance and explicit uncertainty | Core finding/evidence contracts and comparator tests.                                   |
| Native harness discovery                   | Claude/Codex adapter source and fixtures.                                               |
| Two-to-one cwd example                     | `packages/harness-codex/src/cross-harness.test.ts`, Scenario A/B assertions.            |
| No model calls required                    | Deterministic core and local CLI analysis path; no AI service dependency.               |
| Read-only analysis intent                  | `AGENTS.md`, CLI and Git isolation specifications.                                      |
| No agent execution                         | Adapter discovery reads configuration; Git snapshots disable checkout hooks.            |
| 271 tests at Phase 6                       | User-provided Phase 6 handoff reports a passing cold run; not independently rerun here. |

An attempted disposable baseline build was rejected by execution-policy review under the repository's no-execution rule.
No alternative execution path was used to bypass that rejection.
Website examples are curated from checked-in assertions, not represented as newly captured CLI output.
Website-only build and test results are recorded separately in `validation.md`.

The website does not claim complete machine state, runtime MCP discovery, semantic understanding, released CI integration, or identical agent behavior.
The owner reports that Claude's Phase 7 GitHub Action work is complete separately on `main` as of August 30.
It is absent from this branch and must be reviewed after owner-authorized integration; completion is not evidence of a published release.
No files from that track were edited or incorporated here.

## Cohort research: relevant patterns, not acceptance guarantees

The [official cohort directory](https://vercel.com/open-source-program) includes these projects.
Their public repositories were briefly inspected for concrete presentation patterns:

- [AST Explorer](https://github.com/sxzz/ast-explorer) makes a narrow technical capability tangible through an interactive tool and explicitly invites additional parser contributions.
  PlaybookDiff can similarly expose a small fixture example and a clear fixture contribution path.
- [Claude Code Templates](https://github.com/davila7/claude-code-templates) presents a specific coding-agent configuration utility through a CLI and a browsable public surface.
  PlaybookDiff should explain its distinct analysis boundary without implying an endorsement or partnership.
- [Fumadocs](https://github.com/fuma-nama/fumadocs) pairs a focused developer purpose with a public documentation site and contributing guidance.
  PlaybookDiff's deployable site and source-linked references follow that general clarity pattern, not its wording or design.

Inference: precise utility, visible working examples, maintained public documentation, and clear contribution opportunities are useful presentation qualities.
These observations do not establish why any project was selected, and their adoption metrics are not PlaybookDiff's metrics.

## Strongest advantages

- Working deterministic product rather than a concept page.
- Concrete emerging workflow problem spanning two coding harnesses.
- Stable-ID regression analysis that distinguishes new debt from existing debt.
- Inspectable source evidence and explicit unknown states.
- Bounded, credible Vercel use without unnecessary infrastructure.
- A fixture contribution model that can make community feedback actionable.

## Biggest risks

1. Private source currently conflicts with an open-source application.
2. No verified external adoption, contributor base, release, or package distribution.
3. Phase 7 CI work exists separately on `main`, but integration and release verification are still pending.
4. Community reporting and release workflows need real public testing.
5. A marketing site cannot substitute for real examples and maintainer follow-through.
6. Acceptance is discretionary; polish improves presentation but does not guarantee selection.

## Metrics to capture after public launch

| Metric                | Definition/source                                                       | Caution                                                              |
| --------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Stars/forks           | Dated GitHub repository metadata snapshot.                              | Discovery signal, not active usage.                                  |
| External contributors | Unique non-owner humans with accepted contributions.                    | Exclude bots; distinguish authors from committers.                   |
| External issues/PRs   | Unique external reporters and contributors.                             | Count substantive feedback separately from duplicates.               |
| Accepted fixtures     | Reproducible compatibility cases merged from community feedback.        | Track quality and semantics, not just volume.                        |
| Action use            | Observable public workflow references and opt-in reports after release. | Private installs are not generally observable; do not estimate them. |
| Package downloads     | Registry data after verified publication.                               | Automated downloads are not users.                                   |
| Site use              | Only if later approved measurement is implemented.                      | Currently unavailable; no analytics installed.                       |
| Supported harnesses   | Adapters with documented behavior and fixture coverage.                 | A roadmap entry does not count.                                      |

Capture a launch-day baseline and a dated snapshot before September 13.
If there is little change, submit the actual numbers and emphasize learning goals instead of implying momentum.
