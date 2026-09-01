# Vercel OSS application preparation

Prepared August 29, 2026; updated September 1, 2026 against the completed public launch.
This is a prepared draft, not a submitted application.
Every evidence link below was verified anonymously on September 1, 2026.
The remaining work is owner review, the personal fields, and submission.

## Program terms, rechecked September 1, 2026

Rechecked against the [live official program page](https://vercel.com/open-source-program) rather than earlier notes.

| Term                    | Current value                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Application status      | Open. The page states "Open until September 13: Summer cohort".                                                      |
| Deadline                | September 13. No cutoff time or timezone is published; treat September 12 as the practical last safe day.            |
| Open source             | "Be an open source project that is actively being developed and maintained".                                         |
| Hosting                 | "Be hosted on or intended to host on Vercel".                                                                        |
| Impact                  | "Show measurable impact or growth potential".                                                                        |
| Code of Conduct         | "Follow a Code of Conduct to define community standards and signal inclusivity".                                     |
| Credit usage            | "Use credits exclusively for open source work and the project itself".                                               |
| Early-stage eligibility | Explicitly eligible: "Absolutely! We encourage applications from projects at all stages of development."             |
| Benefits                | $3,600 in Vercel platform credits over 3 years, an OSS Starter Pack with third-party credits, and community support. |

The terms are unchanged from the August 30 check.

### How PlaybookDiff meets each criterion

| Criterion                    | Evidence                                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open source, maintained      | MIT, public, `v0.1.0` released September 1, 2026, active commit history.                                                                                          |
| Hosted on Vercel             | Production site live at <https://playbookdiff.vercel.app>, deployed from this repository via the Vercel Git integration.                                          |
| Impact or growth potential   | Deterministic tooling for a problem that grows as repositories adopt more than one coding agent. Stated as a hypothesis, not measured adoption.                   |
| Code of Conduct              | [`CODE_OF_CONDUCT.md`](https://github.com/JacobisEpic/playbookdiff/blob/main/CODE_OF_CONDUCT.md), detected by GitHub; private vulnerability reporting is enabled. |
| Credits for the project only | Usage boundaries stated below under "Why Vercel and how credits would be used".                                                                                   |

## Application form

The linked [application](https://open-source-program.vercel.app/) is a client-rendered form, so its fields cannot be read without loading it in a browser.
Three narrative prompts were recorded during an earlier read-only inspection: "Tell us about your project", "What distinguishes your project from other open source projects?", and "Anything else we should know?".
The first was described as a one- or two-sentence summary.
Reconfirm the live field list before filling it in; only those three prompts are treated as confirmed.
No answers or personal information have been entered or submitted.

## Observed prompt: project summary

PlaybookDiff is an MIT-licensed developer tool that detects repository-configuration drift between Claude Code and Codex.
It compares the instructions, skills, MCP configuration, and scope each harness receives, with a CLI that can identify newly introduced compatibility regressions between Git revisions.

## Observed prompt: what distinguishes the project

PlaybookDiff treats multi-agent configuration as an inspectable engineering problem, not a prompt-copying exercise.
Its adapters model each harness's discovery rules, including the distinction between the launch directory and the target file, then compile a shared representation with source provenance.
The comparator reports proven structural differences and preserves uncertainty when prose or runtime state cannot be evaluated deterministically.
Stable finding IDs let Git revision analysis separate new regressions from existing configuration debt.
Developers retain native configuration files, run analysis locally without model API keys, and can contribute minimal fixtures that make harness behavior independently reviewable.

## Observed prompt: anything else

PlaybookDiff is a deterministic static analyzer, not a wrapper around a model.
It ships a deterministic comparison engine, two harness adapters, the `check`, `explain`, and `diff` CLI commands, and a GitHub Action that fails a pull request only when that pull request introduces a new compatibility regression, so pre-existing configuration debt never blocks a team.
402 tests pass across the engine, both adapters, the CLI, and the Action.
`v0.1.0` was released on September 1, 2026, and the Action was verified from an unrelated public repository in both its passing and failing paths, including nested-scope derivation from the pull request's changed paths.
The analyzer was validated end to end against public open-source repositories with substantial agent configuration; every finding was manually audited, and every defect found that way was fixed and locked with a regression test. The methodology is published in [`docs/validation.md`](https://github.com/JacobisEpic/playbookdiff/blob/main/docs/validation.md).
The project is new and has no adoption story: 0 stars, 0 forks, and one contributor at launch.
The case rests on the concrete problem, the working implementation, and the published limitations, not on traction.

## Supporting narrative: problem and audience

A repository can contain equivalent-looking agent instructions while delivering different effective configuration to each coding agent.
Nested discovery, skill invocation policy, and MCP declarations differ across harnesses, and ordinary file diffs do not explain the resulting compatibility impact.
PlaybookDiff is for developers using both agents, open-source maintainers, teams standardizing agent-assisted development, and repositories migrating between harnesses.
It does not promise identical model output.

## Why open source

Configuration compatibility should be inspectable infrastructure rather than a proprietary service dependency.
An open implementation lets maintainers audit how conclusions were reached, add fixtures for newly documented behavior, improve adapters, and use the analyzer in public or private codebases.
Future harness support should be evidence-driven and preserve the deterministic boundary.

## Growth potential and community impact

The growth thesis is that repositories adopting multiple coding agents will need repeatable ways to inspect configuration differences.
This is a product hypothesis, not a measured market-size claim.
The initial contribution loop is small and concrete: report a real configuration mismatch, reduce it to a fixture, verify the harness behavior, and improve the adapter or document uncertainty.
Useful outcomes include fewer unreviewed configuration regressions, clearer migration decisions, and reusable public examples for other maintainers.

## Why Vercel and how credits would be used

Vercel would host the public project website, example reports, and community-facing documentation.
Preview deployments would let contributors review changes to technical explanations and examples before merging.
If user feedback warrants it, a later read-only report viewer could make locally generated reports easier to explore; a hosted analyzer is not part of this proposal.
Credits would be restricted to this project's open-source public surface and contribution previews, with usage reviewed monthly.
No credits are proposed for unrelated private projects, personal usage, model inference, or speculative infrastructure.

## Success measures

Track public stars and forks as discovery signals, not proof of active usage.
Track unique external contributors, externally opened issues, accepted fixture contributions, and reproducible reports from independent repositories as stronger feedback signals.
Track package downloads only after verified distribution exists, and Action adoption only through observable public usage or voluntary reports.
Track website use only if the owner later chooses a privacy-conscious measurement approach; this site includes no analytics.
Record dates, sources, and definitions so future application updates do not mix estimates with measurements.

## 30/60/90-day plan

### First 30 days

Completed on September 1, 2026:

- Made the repository public after a full-history secret and privacy audit.
- Published the `v0.1.0` release and the movable `v0` Action tag.
- Verified the Action from an unrelated public repository in both the passing and failing paths.
- Deployed the project site to Vercel and set the verified URL as the repository homepage.
- Verified the GitHub/Vercel integration in both directions: `main` push to production, branch push to preview.
- Captured a dated public metrics baseline.

Remaining in this window:

- Submit this application before the verified September 13 deadline.
- Publish reproducible real-world examples, with maintainer permission before naming any repository.
- Share a short technical demo with relevant developer communities and record the feedback.

### By 60 days

- Turn recurring feedback into fixture contributions and clearer setup documentation.
- Improve package distribution and integration examples based on actual installation failures.
- Document additional supported compatibility cases only after official evidence or reproducible observation.
- Review contributor onboarding and community-reporting channels.

### By 90 days

- Evaluate an additional harness only if maintainers can support its semantics and fixtures.
- Evaluate read-only report visualization based on demonstrated demand, without server-side repository execution.
- Publish an honest progress note showing contributions, examples, unresolved cases, and usage evidence.
- Reassess hosting usage and the roadmap against community needs.

## Evidence package

Every link verified anonymously on September 1, 2026; all returned HTTP 200.

| Item                   | URL                                                                           |
| ---------------------- | ----------------------------------------------------------------------------- |
| GitHub repository      | <https://github.com/JacobisEpic/playbookdiff>                                 |
| Production website     | <https://playbookdiff.vercel.app>                                             |
| README                 | <https://github.com/JacobisEpic/playbookdiff/blob/main/README.md>             |
| `v0.1.0` release       | <https://github.com/JacobisEpic/playbookdiff/releases/tag/v0.1.0>             |
| GitHub Action docs     | <https://github.com/JacobisEpic/playbookdiff/blob/main/docs/github-action.md> |
| Validation methodology | <https://github.com/JacobisEpic/playbookdiff/blob/main/docs/validation.md>    |
| Scope and limitations  | <https://github.com/JacobisEpic/playbookdiff/blob/main/docs/limitations.md>   |
| Security model         | <https://github.com/JacobisEpic/playbookdiff/blob/main/docs/security.md>      |
| Code of Conduct        | <https://github.com/JacobisEpic/playbookdiff/blob/main/CODE_OF_CONDUCT.md>    |
| License (MIT)          | <https://github.com/JacobisEpic/playbookdiff/blob/main/LICENSE>               |
| Contributing           | <https://github.com/JacobisEpic/playbookdiff/blob/main/CONTRIBUTING.md>       |

Do not link the disposable Action smoke-test repository from the application; it exists as internal launch evidence and is recorded in [`public-launch-checklist.md`](public-launch-checklist.md).

## Facts to restate at submission

These change independently of this document; reread them rather than copying the numbers above.

- Star, fork, issue, and contributor counts.
- The current test total.
- The latest release tag.

## Owner-supplied fields

The following cannot be answered on the owner's behalf and are the only blockers left:

- Name.
- Email address.
- Any Vercel account, team, or project identifier the form requests.
- Personal and team background, and the owner's own maintainer relationship to the project.
- Any consent or terms checkbox.

Submission itself is deliberately left to the owner.
