# Launch-track validation

Final validation date: August 30, 2026.
Product evidence is pinned to baseline `1bb33848fcd0f64ce9e6cdc9dcd380b6aef0b06b`.
Only the standalone website's established tooling was executed during this final pass.
No CLI, core, harness, GitHub Action, analyzed-repository scripts, or repository hooks were executed.

## Standalone installation and build

The following sequence passed from this worktree's `website/` directory:

```sh
npm ci
npm run typecheck
npm run lint
npm run build
npm test
```

Tests inspect production-rendered HTML, so the production build intentionally precedes the tests.
The runtime was Node.js 24.20.0 with npm 11.19.0.
Next.js telemetry was disabled for the validation builds.

The same sequence passed in a fresh temporary directory containing only a copy of `website/`.
The copy excluded `node_modules`, `.next`, generated Next.js type declarations, and TypeScript build information before installation.
No product packages, root package manifest, root lockfile, root configuration, or root `node_modules` were copied.
Both installs used only the website's own `package.json` and `package-lock.json`.
One unnecessary regular-expression escape in a test was corrected after lint flagged it, then the checks were rerun successfully in both locations.

| Check            | Result                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Clean `npm ci`   | Passed in both locations; 30 packages installed, 31 audited, zero reported vulnerabilities.                          |
| Typecheck        | Passed: Next.js route type generation and strict TypeScript checking.                                                |
| Lint             | Passed with warnings denied, including React and accessibility rules.                                                |
| Production build | Passed with Next.js 16.3.3; homepage, not-found page, and favicon prerendered.                                       |
| Tests            | 10 passed, zero failures, zero skipped, in both locations.                                                           |
| Formatting       | Passed with the already-established pinned Oxfmt 0.65.0; no formatter dependency added.                              |
| HTTP smoke check | Homepage and favicon returned 200; all eight referenced Next.js assets returned 200; nonexistent route returned 404. |
| Response header  | `X-Powered-By` omitted as configured.                                                                                |

The temporary production server was used only for local HTTP checks, not deployed to Vercel.
No browser was opened during this final pass.

## Automated coverage

The 10 tests cover rendered product copy and primary links, supported command examples and exit semantics, the two fixture scenarios, static-demo labeling, repo-relative evidence paths, anchor targets and baseline-pinned source links, metadata without an invented origin, semantic page structure and limitations, independent dependencies, and source-path/environment/font restrictions.
They do not execute the product comparator or prove real-world agent behavior.
The fixture selector was checked interactively during the earlier visual review, not by the static HTML tests.

## Earlier visual and interaction review

Before the owner asked for the browser to be closed, the production site was rendered at desktop 1440 x 1000 and mobile 390 x 844.
Hero and fixture-report screenshots were inspected at both sizes.
No horizontal document overflow was observed in those views.
Clicking the example navigation link worked.
Selecting `apps/api` changed the report from two findings to one, and selecting the repository root restored two findings.
Visible button focus styling was inspected, and no browser warning or error logs were returned during the checks.

Keyboard activation through the hidden browser controls was inconclusive; it is not reported as a passing end-to-end keyboard test.
Native buttons, fieldset/legend semantics, pressed states, live announcements, focus styles, and keyboard-scrollable command blocks were reviewed in source and passed accessibility lint.
The page was not re-opened after the owner's close-browser request.
A complete signed-out deployment review, including keyboard-only navigation, lower-page layout, and final launch screenshots, remains an owner launch check rather than a claimed validation result here.

## Content and provenance audit

- Supported CLI syntax, source installation, exact two-revision semantics, no-fetch behavior, and exit codes were checked against baseline `docs/cli.md` and `docs/git-diff.md`.
- Instruction, skill, and MCP comparison claims were checked against baseline comparison documentation, implementation, and fixture assertions without executing them.
- The root/API example preserves two medium findings versus one medium scope gap, plus two versus three structurally equivalent logical entities.
- The wording fixture remains informational unknown, and the parity fixture describes configuration equivalence only, never behavioral equivalence.
- Every linked baseline source path was checked in the Git tree, including the directory link for the wording fixture.
- Source scans found no absolute host paths, private session links, or common credential patterns in the authored deliverables.
- Public package distribution, released Action support, adoption, active users, downloads, and Vercel program acceptance are not claimed.
- The 50-word and 150-word positioning sections were counted and match their labels.
- The official Vercel program page and read-only GitHub visibility/metadata/release queries were rechecked on August 30.
- The private-repository blocker remains explicit; repository settings were not changed.

The earlier reported Phase 6 total of 271 tests is attributed to the owner's handoff, not represented as a test run performed by this track.
The prior baseline execution-policy rejection was respected; no alternate execution path was used.
Claude's completed Phase 7 remains separately on `main`, with reconciliation instructions in `post-merge-integration.md`.

## Ownership boundary

This branch contains only new files under `website/` and `launch/`.
The final handoff records commit IDs, remote synchronization, the complete file list, and clean Git status after the isolated branch is pushed.
There is no root workspace integration, product implementation change, settings mutation, Vercel deployment, pull request, merge, rebase, or push to `main` in this track.
