# Post-merge integration notes

> **Historical process document.**
> Written on a pre-merge branch, before the GitHub Action work and this repository's website work were on `main` together.
> That reconciliation has since happened, so statements below about pending integration, separate branches, and superseded test totals describe a state that no longer exists.
> For current product facts see [`README.md`](../README.md), [`docs/limitations.md`](../docs/limitations.md), and [`docs/validation.md`](../docs/validation.md).
>
> All eleven reconciliation steps below were completed on September 1, 2026.
> The outcome is recorded in [`public-launch-checklist.md`](public-launch-checklist.md); this file is kept for the reasoning, not as outstanding work.

This branch begins at `1bb3384` and adds files only under `website/` and `launch/`.
Claude's Phase 7 work is now complete separately on `main`, as reported by the owner on August 30, 2026.
The read-only local ref check found `main` at `672fa0894bc935d965672d161bda79ff815a8f01`.
This branch does not contain or depend on that work, and this track has not validated Phase 7 functionality or release status.
No merge, rebase, main push, settings change, or deployment is part of this task.

## Reconcile only after this isolated branch is finished and pushed

1. Review the pushed `codex/vercel-readiness` commits and Claude's completed Phase 7 changes independently, using their recorded commit IDs.
2. In a separate owner-authorized integration branch based on the completed Phase 7 `main`, merge `codex/vercel-readiness` through the normal review workflow, or cherry-pick its website commit followed by its launch-document commit.
   Choose one approach, not both; do not rebase or rewrite this isolated branch.
3. Review the integration diff and confirm this track contributes only additive `website/` and `launch/` files.
   Resolve any overlapping files explicitly rather than overwriting either track.
4. Run the standalone website checks from `website/` and have the Phase 7 owner run the integrated product suite in its authorized development environment.
   Preserve the no-execution rule for analyzed repositories; this handoff does not authorize bypassing it.
5. Independently verify the Action's functionality, permissions, packaging, documentation, and release process, plus the CLI's consumer installation path.
   Completed development on `main` is not evidence of a published release or a supported installation command.
6. Update release and Action claims only after those checks, then reconcile the root README, contribution guide, and any CI integration through a separate reviewed change.
7. Have the owner review source and history for secrets and private information, including owner-facing launch materials, before making the repository public.
8. Deploy the website using root directory `website`, then verify repository, documentation, community, and site links signed out.
9. Set `productionOrigin` in `website/lib/site.ts` to the real HTTPS origin and update the metadata test.
10. Have the owner update repository description, homepage, and topics from the positioning kit.
11. Capture current metrics, review the application draft against the integrated release, recheck live Vercel terms, and submit manually before the verified deadline.

## Changes intentionally left for integration

- Root README: website link, accurate final release and CI status.
- Root contribution guide: optional standalone website workflow.
- CI workflows: optional website checks scoped to `website/**`; keep npm's website lockfile separate from pnpm's product lockfile.
- Release metadata: a real tag and supported package installation instructions.
- Community files: issue template, security policy, and a working private conduct-reporting channel.
- Website pre-release wording: remove the source-access caveat only after public access is verified.
- Fixture links: currently pinned to baseline `1bb3384`; update only after checking that the example assertions still hold.
- Canonical/social metadata: no domain was invented; add a production origin and optional image after deployment.

These are recommendations, not changes made to files owned by Claude.
Do not silently add the website to the root pnpm workspace or replace root tooling to make deployment easier.
Vercel should install and build the standalone `website/` package directly.
