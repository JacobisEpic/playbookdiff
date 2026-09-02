## Summary

<!-- What changed, and what user or contributor friction does it remove? -->

## Evidence

<!-- For harness semantics, link current official documentation or describe the reproducible fixture evidence. -->

## Validation

- [ ] `pnpm fmt:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm action:verify-bundle`
- [ ] `pnpm cli:verify-package` when CLI packaging or bundled runtime code changed
- [ ] Standalone website checks when `website/` changed

## Safety and scope

- [ ] Analysis remains read-only and does not execute code from an analyzed repository.
- [ ] Provenance and explicit `unknown` results are preserved.
- [ ] No unsupported semantic or behavioral equivalence claim was added.
- [ ] No private configuration, secrets, absolute host paths, or external project findings are included.
