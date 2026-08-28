# PlaybookDiff contributor instructions

- Preserve read-only analysis semantics.
- Never execute code, package scripts, hooks, or binaries from an analyzed repository.
- Keep harness-specific discovery and resolution behavior inside its adapter package.
- Keep normalized cross-harness concepts inside `packages/core`.
- Preserve source provenance and explicit uncertainty for every meaningful result.
- Never guess harness behavior.
- Prefer current official documentation, then reproducible fixture evidence.
- Treat fixtures as stronger evidence than implementation intuition.
- Do not add unsupported product scope.
- Run typecheck, lint, formatting checks, tests, and builds after implementation changes.
- Stop when a task defines a phase boundary.
