# Contributing to PlaybookDiff

Thank you for helping improve PlaybookDiff.

## Before changing harness semantics

Harness behavior must be supported by current official documentation or a minimal reproducible fixture against the real harness.
When documentation and observed behavior differ, document the discrepancy and preserve an explicit unknown instead of guessing.
Update the adapter specification, fixtures, and implementation together when established semantics change.

## Development setup

Use Node.js 24 LTS and the pnpm version pinned in `package.json`.

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm fmt:check
pnpm test
pnpm build
```

## Pull requests

Keep changes within the current product and phase boundary.
Include fixture coverage for filesystem or harness discovery behavior.
Do not execute code from analyzed repositories.
Explain new assumptions, unsupported states, and provenance behavior in the pull request.
