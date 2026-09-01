# Security model

PlaybookDiff reads a repository's agent configuration, which routinely sits beside credentials, environment references, and instructions that tell an agent what it may do.
This describes exactly what the analyzer does and does not do with that material, and how those properties are enforced.

Every property below is a statement about the current implementation, tested rather than asserted.

## Read-only analysis

Analysis never writes to the repository it analyzes.

`check` reads files and nothing else.
`diff` needs two revisions, and checks each one out into a disposable detached worktree in a temporary directory, removed in a `finally` so cleanup runs on failure too.
A detached worktree has its own index and is independent of the checkout you have open, so the analyzed repository's `HEAD`, current branch, index, tracked files, untracked files, remotes, and configuration are untouched.

Real-repository validation verifies this by comparing the full Git state before and after every run; see [validation](validation.md#read-only-verification).

## No code from the analyzed repository is executed

The analyzer parses configuration. It never runs it.

- No package scripts, build commands, or binaries.
- No skill scripts, even though skills routinely ship executable helpers.
- **No Git hooks.** `git worktree add` performs a checkout, which would normally run a repository's own `post-checkout` hook. That call sets `core.hooksPath` to an empty directory for its duration, so a repository cannot get code executed by being analyzed.

This matters most in CI, where the analyzed revision may come from an untrusted fork.

## No network access

Core analysis makes no network requests.

- **MCP servers are never contacted.** A server definition is read as configuration. The analyzer does not connect, initialize, authenticate, or list capabilities, so runtime capability information is reported as unknown rather than discovered.
- **No model is called.** Comparison is deterministic. There is no inference step, and no repository content is sent anywhere.
- **Git never fetches.** Revisions must already exist locally. An unresolvable revision is an error naming the checkout depth problem, never an implicit fetch.
- **No GitHub API.** The Action reads its event payload from the filesystem and derives changed paths from local Git object data, so it needs no token and no API permissions.

## Secrets are never resolved

Configuration frequently references credentials. None of it is resolved or reproduced.

- `${VAR}` and `${VAR:-default}` expressions are preserved symbolically, exactly as written.
- The analyzer's own host environment is never substituted into an analyzed value.
- A configured literal value is represented only as redacted, with its variable name. The value itself never enters a finding, an evidence excerpt, a finding ID, or JSON output.
- MCP evidence is restricted to non-secret structural facts: server name, transport, which fields are configured, and environment variable names. Command strings, arguments, URLs, and environment values are omitted, because any of them can carry a credential.

Because a redacted value proves neither equality nor difference, two redacted values compare as undetermined rather than equal.

## Path containment

Analysis stays inside the repository boundary it was given.

A launch directory or work target that resolves outside the repository is rejected.
Symlinks are resolved before that check, so escaping through a link is caught the same way as escaping through `../`.
An in-repository symlink is followed and reported at the path where the harness reads it; one pointing outside the repository is refused with an `outside-repository` diagnostic rather than silently dropped.

Imports follow the same rule, with a documented recursion limit and defensive cycle detection.

## Output safety

Output is meant to be pasted into an issue or read in a public CI log.

- Serialized paths are repository-relative. Host paths, temporary directories, and worktree locations do not appear in findings, evidence, or JSON output.
- Instruction excerpts are short, and exist to identify the compared item rather than to reproduce a file.
- Step Summary content that originates in the analyzed repository is Markdown-escaped, so repository content cannot break the summary's structure or inject formatting or links.

## Fork pull requests

The Action needs `contents: read` and nothing more.

It requires no token, writes no comment, and calls no API, so it behaves identically for a fork pull request and an internal one, and there is no elevated-permission path for untrusted code to reach.
Because the analyzed revision is never executed, running it against a fork's head commit does not execute that fork's code.

## Reporting a vulnerability

Please report suspected vulnerabilities privately rather than in a public issue.
See [SECURITY.md](../SECURITY.md).
