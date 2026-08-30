# Git regression diffing

`playbookdiff diff` answers a narrower question than `playbookdiff check`.
It does not ask "does compatibility divergence exist in this repository right now."
It asks "did this Git change introduce a _new_ Claude Code ↔ Codex compatibility regression."

Pre-existing divergence that both revisions share is never a reason for `diff` to fail.
Only newly introduced actionable findings are.

## Syntax

```sh
playbookdiff diff <baseline>..<candidate> [repository]
```

Examples:

```sh
playbookdiff diff main..HEAD
playbookdiff diff origin/main..HEAD .
playbookdiff diff main..feature --cwd apps/web --path apps/web/src/page.tsx
playbookdiff diff main..HEAD --json
```

`repository` defaults to `.`, matching `check` and `explain`.

## The range is exactly two revisions, nothing more

`diff` supports only the explicit two-dot form: `BASELINE..CANDIDATE`.
This means exactly what it says: analyze `BASELINE`, analyze `CANDIDATE`, and compare the two.

There is no merge-base substitution.
Triple-dot syntax (`main...HEAD`) is rejected, not reinterpreted, because Git's own triple-dot meaning ("changes since the common ancestor") is a different question than "compare these two exact snapshots," and silently picking one would be exactly the kind of hidden Git magic this command avoids.

A range missing a baseline, missing a candidate, using more than one `..` separator, or omitting `..` entirely is rejected with a clean error and exit code 2.

## What gets analyzed

For each of the two revisions, `diff` runs the same deterministic analysis `check` would run against a real checkout of that commit: it compiles the effective Claude Code and Codex configuration and compares them with `compareEffectiveConfigs`.
The `--cwd` and `--path` you pass apply identically to both revisions, since they describe the same logical launch directory and work target, not two different ones.

Only committed content is analyzed.
`HEAD` as a candidate means the committed `HEAD` snapshot, not your working tree.
Staged changes, unstaged changes, and untracked files are never included in either revision, even when they exist in your checkout at the time you run `diff`.
If you want to check the effect of uncommitted changes, commit them (even to a throwaway branch) first, or use `playbookdiff check` directly against your working tree.

If the requested `--cwd` or `--path` does not exist at one of the two revisions (for example, a directory was added after the baseline commit), `diff` reports a clean analysis error and exits 2 rather than inventing a substitute location.

## Isolation: your checkout is never touched

`diff` never runs `git checkout`, `git switch`, or `git reset` against the repository you pass it, and it never fetches a remote.
Each revision is checked out into its own disposable, detached `git worktree` in a temporary directory, analyzed there, and then removed.

This means:

- Your active branch and `HEAD` are never changed.
- Uncommitted changes (staged, unstaged, or untracked) are never touched, moved, or lost.
- The command works correctly even when your working tree is dirty.
- Temporary worktrees and their directories are always cleaned up, on both success and failure.

`origin/main` is resolved exactly as it currently exists in your local repository.
`diff` never runs `git fetch` or `git pull`, so a stale local `origin/main` stays stale until you fetch it yourself.

## Regression semantics

Findings are matched between the baseline and candidate reports by their stable finding ID alone, never by source line number, file path inside a temporary directory, or prose wording.
This is the same stable-ID design `check` and `explain` already rely on, so a finding that merely shifted lines, or was re-analyzed from a different temporary checkout root, is still recognized as the same finding.

Every finding in the candidate report is one of:

- **Introduced** - its ID did not appear in the baseline report.
- **Unchanged** - its ID appears in both reports.

Every finding in the baseline report that is not in the candidate report is:

- **Resolved** - it existed at baseline and no longer exists at the candidate.

A finding's severity is a deterministic function of its category and type, both of which are already embedded in its stable ID.
This means the same ID can never carry a different severity between two reports, so there is no "the same finding got worse" case to model separately from introduced/resolved/unchanged.

### What counts as a regression

An introduced finding only fails `diff` when it is **actionable** under PlaybookDiff's existing policy: severity `medium` or `high`.
This is the identical policy `check` already uses; `diff` does not define a second one.

- A new `medium` or `high` finding is a regression.
- A new `low` or `info` finding (including a new deterministic `unknown`) is shown as an introduced finding, but is not a regression and does not fail the command.
- A resolved finding never fails the command, regardless of its severity.
- An unchanged finding, no matter how severe, never fails the command - it is pre-existing debt the candidate did not create.

## Exit codes

```text
0   analysis completed; the candidate introduced no new actionable regression
1   analysis completed; the candidate introduced one or more new actionable regressions
2   PlaybookDiff could not perform the analysis (invalid range, unresolvable revision, non-Git repository, invalid --cwd/--path, ...)
```

## Human output

Introduced findings are shown first and in full, since they are what changed because of this candidate.
Resolved findings are shown next, in full, since a fix is worth confirming.
Unchanged pre-existing findings are summarized as a single count rather than printed in full, so the output stays focused on what this revision actually changed; inspect them directly with `playbookdiff check` against a specific revision if needed.

## `--json`

```sh
playbookdiff diff main..HEAD --json
```

```ts
{
  context: { repository, cwd, targetPath? },
  baseline: { revision, commit, diagnostics: { claude: Diagnostic[], codex: Diagnostic[] } },
  candidate: { revision, commit, diagnostics: { claude: Diagnostic[], codex: Diagnostic[] } },
  diff: {
    introduced: CompatibilityFinding[],
    resolved: CompatibilityFinding[],
    unchanged: CompatibilityFinding[],
    summary: {
      introduced: number,
      introducedActionable: number,
      introducedInformational: number,
      resolved: number,
      unchanged: number,
    },
  },
}
```

`commit` is the full resolved SHA for the revision you named in `revision`.
Each finding is the unmodified `CompatibilityFinding` type from `@playbookdiff/core` - the same shape `check --json` returns - not a second, diff-specific finding shape.

The full baseline and candidate `CompatibilityReport`s are deliberately not included, since that would mean repeating every pre-existing finding on both sides just to describe a delta.
Diagnostics from both harnesses at both revisions are preserved, since a diagnostic can matter even though it does not become a `CompatibilityFinding` itself.

`--json` output contains no ANSI styling, no log lines, and is deterministic: running the same `diff` twice against the same two commits produces byte-identical stdout.
It also never contains an absolute path to the temporary directory a revision was checked out into; the only repository path shown is the one you passed as `repository`.

## Limitations

- No merge-base semantics. `main..HEAD` compares exactly those two commits, whatever their relationship.
- No working-tree mode. Uncommitted changes are never part of either revision analyzed.
- No implicit fetch. A local ref that is behind its remote is analyzed as-is.
- Submodules are analyzed at whatever the Gitlink resolves to in each worktree snapshot; submodule contents are not recursively checked out.
- Git LFS objects are not fetched; LFS-tracked files are analyzed as their pointer content, not their real contents, if the objects are not already present locally.
- There is no `playbookdiff diff explain`. Investigate an introduced or resolved finding's stable ID with `playbookdiff explain <finding-id>` against the specific revision it belongs to.

## Running this in CI

See [`docs/github-action.md`](github-action.md) for a reusable GitHub Action that wraps this exact command for pull-request CI, including automatic baseline/candidate detection from PR events.
