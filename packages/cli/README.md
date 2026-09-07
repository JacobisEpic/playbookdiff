# playbookdiff

Deterministic, read-only compatibility checker for repositories that configure both Claude Code and Codex.

PlaybookDiff compiles the repository-defined instructions, skills, and MCP servers each harness effectively receives, compares them structurally, and explains proven differences with source evidence.
It never modifies or executes the analyzed repository, connects to configured MCP servers, resolves secrets, or calls a model.

## Install

Requires Node.js 24.11 or newer within the 24.x release line.

```sh
npm install --global playbookdiff
```

Or run it once, without installing it:

```sh
npx playbookdiff check .
```

## Usage

```sh
playbookdiff check .
playbookdiff explain <finding-id> .
playbookdiff diff origin/main..HEAD
```

`check` analyzes one repository context.
`explain` traces a stable finding ID back to its evidence.
`diff` compares committed Git revisions and fails only on newly introduced actionable findings.

Exit codes are `0` for no actionable divergence, `1` for actionable findings, and `2` when analysis cannot run.

See the [full documentation](https://playbookdiff.dev/docs) for options, supported semantics, limitations, and the security model.
