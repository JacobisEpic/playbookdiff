# playbookdiff

Read-only compatibility checker for repositories that configure both Claude Code and Codex.

It compiles the instructions, skills, and MCP servers each harness actually receives, compares them deterministically, and explains where they diverge.
It never modifies the repository it analyzes, never runs anything from it, and never claims the two agents will behave the same.

```sh
playbookdiff check .
playbookdiff diff origin/main..HEAD
```

Exit codes: `0` no actionable divergence, `1` actionable findings exist, `2` the analysis could not run.

Requires Node.js 24 (24.11.0 or newer, within 24.x).

Full documentation, including the supported-semantics matrix, known limitations, and the security model, lives in the [repository](https://github.com/JacobisEpic/playbookdiff#readme).
