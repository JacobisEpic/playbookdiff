# GitHub Action

PlaybookDiff ships a reusable GitHub Action that wraps `playbookdiff diff`.
It fails a pull request only when the candidate commit introduces a new deterministic Claude Code ↔ Codex compatibility regression.
Pre-existing compatibility debt never blocks CI, because the Action reuses the exact same baseline-first regression engine documented in [`docs/git-diff.md`](git-diff.md).

The Action is a thin wrapper: it contains no comparator, actionability, or regression logic of its own.
It calls the same `runDiff` orchestration the CLI uses, parses the same `--json` contract, and renders the result as a GitHub Step Summary and a small set of outputs.

## Current release status

This repository does not yet have a tagged release.
The examples below show both forms:

```yaml
# Once a v1 release exists:
- uses: JacobisEpic/playbookdiff@v1

# For now, or when developing against this repository directly:
- uses: JacobisEpic/playbookdiff@<commit-sha>
```

See "Release readiness" at the end of this document for exactly what remains before `@v1` is real.

## Example workflow

```yaml
name: PlaybookDiff

on:
  pull_request:

permissions:
  contents: read

jobs:
  playbookdiff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: JacobisEpic/playbookdiff@v1
```

### Checkout requirement

`playbookdiff diff` never fetches from a remote (see [`docs/git-diff.md`](git-diff.md#isolation-your-checkout-is-never-touched)).
Your checkout step must already include both the baseline and candidate commits.
`actions/checkout`'s default is a shallow clone (`fetch-depth: 1`), which usually does **not** include the PR base commit.
Use `fetch-depth: 0` (a full clone) unless you know your repository's history is short enough that a smaller depth reliably includes the base commit too.

If the required commit is missing, the Action fails with a clear message rather than silently fetching it:

```text
Error: could not resolve baseline revision "origin/main"
Ensure your checkout includes the required Git history (for actions/checkout, use "fetch-depth: 0").
```

## Inputs

| Input       | Required | Default                                | Description                                                                                  |
| ----------- | -------- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `baseline`  | No       | PR base commit (`pull_request` events) | Baseline Git revision.                                                                       |
| `candidate` | No       | PR head commit (`pull_request` events) | Candidate Git revision.                                                                      |
| `cwd`       | No       | `.`                                    | Modeled launch directory, relative to the repository. Applied identically to both revisions. |
| `path`      | No       | (unset - repository root)              | Modeled work target, relative to the repository. Applied identically to both revisions.      |

`cwd` and `path` mean exactly what they mean for the CLI; see [`docs/cli.md`](cli.md#--cwd-vs---path).

### Automatic baseline/candidate detection

On a `pull_request` event, the Action reads `pull_request.base.sha` and `pull_request.head.sha` directly from the event payload (`GITHUB_EVENT_PATH`) - it never calls the GitHub API.

It deliberately does **not** use `github.sha`: for `pull_request` events, `github.sha` is the SHA of GitHub's synthetic merge-preview commit, not the actual PR head, and using it would silently analyze the wrong candidate.

Outside `pull_request` events (`push`, `workflow_dispatch`, and everything else), there is no safe default - the Action fails with a clear error asking for explicit `baseline`/`candidate` inputs rather than guessing (for example, falling back to `HEAD~1`, which is not a reliable candidate-vs-baseline distinction).

### Explicit inputs override automatic detection

`baseline` and `candidate` inputs are honored independently. Providing one does not require providing the other:

```yaml
- uses: JacobisEpic/playbookdiff@v1
  with:
    baseline: origin/main # overrides the PR default; candidate still defaults to the PR head
```

## Outputs

| Output                           | Description                                                            |
| -------------------------------- | ---------------------------------------------------------------------- |
| `result`                         | `no-new-regressions` or `new-regressions`. Not set if analysis failed. |
| `introduced-count`               | Findings introduced by the candidate, any severity.                    |
| `introduced-actionable-count`    | Introduced findings with severity medium/high. Determines pass/fail.   |
| `introduced-informational-count` | Introduced findings with severity low/info.                            |
| `resolved-count`                 | Findings present in the baseline and absent from the candidate.        |
| `unchanged-count`                | Findings present, unchanged, in both revisions.                        |
| `baseline-sha`                   | Full resolved baseline commit SHA.                                     |
| `candidate-sha`                  | Full resolved candidate commit SHA.                                    |

`result` deliberately never says "compatible" or "pass": PlaybookDiff does not claim Claude Code and Codex behave identically, only that no new deterministic configuration regression was introduced.

```yaml
- id: playbookdiff
  uses: JacobisEpic/playbookdiff@v1

- run: echo "${{ steps.playbookdiff.outputs.introduced-actionable-count }}"
```

## Pass/fail behavior

```text
new actionable regression introduced -> Action fails
pre-existing debt only                -> Action succeeds
resolved finding(s) only              -> Action succeeds
new informational unknown only        -> Action succeeds
analysis could not complete           -> Action fails, distinctly
```

A compatibility regression and an analysis failure are different outcomes.
The job log and Step Summary both make the distinction explicit: a regression failure says "PlaybookDiff found N new actionable ... regression(s)"; an analysis failure names the actual problem (unresolvable revision, non-Git repository, `cwd`/`path` missing at one revision) and never claims a regression was found.

## Step Summary

The Action writes a Markdown summary via `GITHUB_STEP_SUMMARY`. It always includes:

- Repository, baseline, candidate (revision label and short SHA), launch `cwd`, and target.
- A single Result line: a new-regression count, or a confirmation that none were introduced.
- Every introduced finding in full (severity, category/type, explanation, evidence, stable finding ID) - this is the part a reviewer actually needs to read.
- Resolved findings as a count only (not repeated in full).
- Pre-existing unchanged findings as a count only, so the summary stays focused on what this PR actually changed.

Text sourced from the analyzed repository (instruction prose, evidence excerpts, file paths, and - for an explicit revision input taken from an untrusted expression - a revision label) is Markdown-escaped before being written, so it cannot break the summary's structure or inject formatting/links.

## Security and fork PRs

- The Action requires only `permissions: contents: read`. It never requests `pull-requests: write` or `issues: write`.
- It makes no GitHub API calls (no PR comments, no Checks API annotations, no Octokit). PR context comes entirely from the local event payload file.
- It never fetches a remote.
- It never executes code, package scripts, or hooks from the analyzed repository. Both revisions are checked out into disposable, detached `git worktree`s with the repository's own Git hooks disabled for that checkout (see [`docs/git-diff.md`](git-diff.md)).
- It works for normal `pull_request` events from forks with no special configuration, secrets, or write token. It does not use `pull_request_target`.
- All Git commands run with argument-array subprocess execution, never shell string interpolation, so revision inputs and repository content cannot be interpreted as shell syntax.

## Deterministic limitations

The Action inherits every deterministic limitation of `playbookdiff diff` unchanged: no merge-base semantics, no working-tree mode (only committed revisions are ever analyzed), no implicit fetch, and no semantic interpretation of instruction prose (a changed instruction with no deterministic match is reported as an informational `unknown`, never a claimed conflict).
See [`docs/git-diff.md`](git-diff.md#limitations) for the full list.

## Architecture

The Action lives in `packages/action` as its own workspace package, bundled with `tsdown` into a single self-contained ECMAScript module committed at `packages/action/dist/index.mjs` and referenced by `action.yml` at the repository root (`runs.using: node24`).

GitHub does not install dependencies before running a `uses:` JavaScript Action, so the bundle inlines everything it needs - `@actions/core`, and the entire `playbookdiff`/`@playbookdiff/core` dependency chain - and has zero remaining `node_modules` imports.
Consuming this Action never requires pnpm, Node.js, or any PlaybookDiff development dependency in the caller's repository or workflow; only the runner's own Node.js (managed by GitHub Actions) is used.

Rebuild the bundle with `pnpm action:build` after changing `packages/action/src/`.
Verify the committed bundle matches source with `pnpm action:verify-bundle` (builds, then fails if `git diff` finds any difference under `packages/action/dist`) - this is the check that would catch someone editing the Action's source and forgetting to regenerate the bundle.

## Release readiness

Making `uses: JacobisEpic/playbookdiff@v1` work for real users still requires, in order:

1. Merge this Action into `main`.
2. Create a Git tag (for example `v1.0.0`).
3. Point a movable major tag (`v1`) at that release, per GitHub's own versioning recommendation for Actions.
4. Optionally, publish the Action to the GitHub Marketplace.

None of these steps were performed as part of this change; they are release operations, not implementation, and are left for a deliberate decision.
