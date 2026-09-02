# Effective scope changes the result

This example shows why matching files are not enough to guarantee matching effective configuration.
It uses the checked-in [`cwd-target` fixture](../../packages/harness-codex/test/fixtures/cross-harness/cwd-target), whose root and nested Claude Code and Codex instructions and skills contain matching content.

The work target is `apps/api/file.ts` in both runs.
Only the directory from which the agents are modeled as launched changes.

Build PlaybookDiff once from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
```

## Launch from the repository root

```sh
node packages/cli/dist/bin.js check \
  packages/harness-codex/test/fixtures/cross-harness/cwd-target \
  --cwd . \
  --path apps/api/file.ts
```

This exits `1` with two medium findings:

```text
MEDIUM  Instruction missing
        Claude Code has an instruction for this effective scope, while Codex has no
        deterministic corresponding instruction.

MEDIUM  Skill capability gap
        The api-skill skill is repository-discovered only for Claude Code, not Codex.
```

Claude Code receives the nested `apps/api/CLAUDE.md` and `api-skill` on demand for the target.
Codex builds its project instruction chain and repository skill discovery from the launch directory, so it does not reach the nested Codex counterparts from `cwd=.`.

## Launch from `apps/api`

```sh
node packages/cli/dist/bin.js check \
  packages/harness-codex/test/fixtures/cross-harness/cwd-target \
  --cwd apps/api \
  --path apps/api/file.ts
```

This exits `0`:

```text
No compatibility findings.
Summary
  Instruction 2 equivalent, 0 divergent, 0 unknown
  Skill       2 equivalent, 0 divergent, 0 unknown
```

The target and every fixture file are unchanged.
Changing only the launch directory brings the nested Codex instruction and skill into its effective configuration.

The exact discovery assertions and expected findings are protected by [`cross-harness.test.ts`](../../packages/harness-codex/src/cross-harness.test.ts).
The fixture is synthetic and demonstrates one harness semantic; it is not presented as an external user's incident.
