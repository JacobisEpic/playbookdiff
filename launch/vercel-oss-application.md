# Vercel OSS application preparation

Prepared on August 29, 2026 against PlaybookDiff baseline `1bb3384`, and reconciled against the current product on August 31, 2026.
This is a draft, not a submitted application.
Do not submit until the repository is public and the evidence links work without authentication.
Program terms were last checked on August 30, 2026; recheck the live page at submission, since the terms below may have moved.

## Verified program context

The [live official program page](https://vercel.com/open-source-program) lists a September 13 summer-cohort deadline, welcomes early-stage projects, and considers maintenance, Vercel hosting intent, impact or growth potential, community standards, and project-only use of credits.
It currently describes $3,600 in credits over three years; cached search snippets showed older terms, so recheck the live page at submission.
No cutoff time or timezone was verified.

The linked [application](https://open-source-program.vercel.app/) was inspected read-only.
Three narrative prompts were visible: “Tell us about your project”, “What distinguishes your project from other open source projects?”, and “Anything else we should know?”.
The form described the first answer as a one- or two-sentence summary.
Only these observed prompts are treated as confirmed fields below.
Other sections are preparation material, not invented form fields.
No answers or personal information were entered or submitted.

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

The project has implemented a deterministic engine, two harness adapters, the `check`, `explain`, and `diff` CLI commands, and a reusable GitHub Action that fails a pull request only when it introduces a new compatibility regression.
The repository ships a standalone Vercel-ready project site with a fixture-backed interactive example, precise limitations, and source-linked documentation.
The analyzer has been validated end to end against public open-source repositories with substantial agent configuration, with every finding manually audited and every defect found that way fixed and locked with a regression test; the methodology is published in `docs/validation.md`.
The project is new: there is no adoption story yet, and the application should emphasize the concrete problem, the existing implementation, and a measurable public-launch plan rather than traction.
Before submitting, recheck and restate the current test total, the release status, the repository's visibility, and whether the site is deployed - all of which change independently of this document.

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

- Reconcile the independent branches and verify all release claims.
- Complete the public-source and security review, make the repository public, and publish a tagged release.
- Deploy the project site on Vercel and add its verified URL to repository metadata.
- Publish two reproducible real-world examples with maintainer permission.
- Share a short technical demo with relevant developer communities and record feedback.
- Submit the application before the verified September 13 deadline if the launch blockers are cleared.

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

## Owner-supplied submission facts

The owner must supply contact details and any requested Vercel identifiers directly in the form.
Confirm public repository access, deployed website URL, latest release, actual test results after integration, and current metrics before submission.
Do not reuse the internal private-repository state as if it describes a completed public launch.
