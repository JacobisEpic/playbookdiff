# Public launch record

Launch date: September 1, 2026.
Launch commit: `51df7bc` (tagged `v0.1.0`); repository `main` has moved on since, as recorded below.
This file replaces the pre-launch checklist it grew out of.
Items are recorded as observed, not as intended.
For current product facts see [`README.md`](../README.md), [`docs/limitations.md`](../docs/limitations.md), and [`docs/validation.md`](../docs/validation.md).

## Completed

| Item                       | State                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Public repository          | Done. <https://github.com/JacobisEpic/playbookdiff> is `PUBLIC`; anonymous clone and raw file fetches verified. |
| Repository description     | Done. "Read-only compatibility checker for Claude Code and Codex repository configuration."                     |
| Homepage                   | Done. <https://playbookdiff.vercel.app>                                                                         |
| Topics                     | Done. Ten topics, listed under [Repository metadata](#repository-metadata).                                     |
| MIT license                | Done. GitHub detects `mit` from `LICENSE`.                                                                      |
| Code of Conduct            | Done. GitHub detects `CODE_OF_CONDUCT.md`.                                                                      |
| Security policy            | Done. `SECURITY.md` detected; private vulnerability reporting enabled via the API.                              |
| Contributing guide         | Done. `CONTRIBUTING.md` publicly reachable.                                                                     |
| Release/tag                | Done. `v0.1.0` published as the latest release; `v0` is the movable major tag. Both resolve to `51df7bc`.       |
| GitHub Action              | Done. Smoke-tested from an unrelated public repository; see [Action verification](#action-verification).        |
| CLI distribution           | Done as a source/tarball path. `npm pack` output installs and runs in an unrelated consumer environment.        |
| Website deployment         | Done. Production alias returns HTTP 200 anonymously.                                                            |
| GitHub/Vercel integration  | Done. `main` push produces a production deployment; branch push produces a preview deployment.                  |
| Public link audit          | Done. Every README, docs, community, and website link checked anonymously; all returned 200.                    |
| Metrics baseline           | Done. Recorded under [Launch metrics baseline](#launch-metrics-baseline).                                       |
| Application evidence links | Done. Every link in the application draft verified anonymously.                                                 |

## Repository metadata

| Signal           | Observed value                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Visibility       | `PUBLIC`                                                                                                                                  |
| Default branch   | `main`                                                                                                                                    |
| Description      | Read-only compatibility checker for Claude Code and Codex repository configuration.                                                       |
| Homepage         | <https://playbookdiff.vercel.app>                                                                                                         |
| Topics           | `claude-code`, `codex`, `ai-agents`, `agents-md`, `claude-md`, `mcp`, `developer-tools`, `static-analysis`, `github-action`, `typescript` |
| Issues           | Enabled                                                                                                                                   |
| Discussions      | Disabled, deliberately                                                                                                                    |
| Actions          | Enabled                                                                                                                                   |
| Branch rules     | None; governance kept light for a single-maintainer project                                                                               |
| Primary language | TypeScript                                                                                                                                |

## Release

- Tag `v0.1.0` -> `51df7bc`, published September 1, 2026.
- Tag `v0` -> `51df7bc`, movable across compatible `0.x` releases.
- Marked as the latest release rather than a GitHub pre-release: `0.x` already states the stability contract, and the Action at `@v0` is meant to be used, so flagging it "not ready for production" would have been inaccurate and would have hidden it from the repository sidebar.
- Release notes cover capabilities, design properties, both usage paths, and link to the limitations and security documents.
- Notes name no validation-target repository and claim no adoption.

## Action verification

The Action was tested from `JacobisEpic/playbookdiff-action-smoke-test`, a disposable public repository containing only invented placeholder configuration.
Both runs resolved `JacobisEpic/playbookdiff@v0` to `51df7bc` from outside this repository.

| Scenario | Change                                              | Result                                                                                    |
| -------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Pass     | Source-only edit, no configuration touched.         | `result=no-new-regressions`, 0 introduced, `analyzed-target-count=2`, job succeeded.      |
| Fail     | Added `server/CLAUDE.md` with no Codex counterpart. | `result=new-regressions`, 1 introduced actionable, `analyzed-target-count=2`, job failed. |

Verified in the real GitHub runtime, not by local simulation:

- External tag resolution to the intended release commit.
- Changed-path derivation producing the nested `server` scope alongside the repository root.
- Exactly one finding for one regression, with no duplication across contexts.
- `GITHUB_TOKEN` reduced to `Contents: read` and `Metadata: read`.
- No dependency installation step, no build step, no GitHub API call.
- Step Summary rendering, reproduced byte-for-byte from the same released bundle.

Neither pull request was merged; both were closed after verification.

## Dogfood workflow

`.github/workflows/playbookdiff.yml` deliberately keeps `uses: ./` rather than `uses: JacobisEpic/playbookdiff@v0`.
`@v0` would re-test the artifact that already shipped, whereas `./` tests the Action as the pull request under review leaves it, including an unbuilt bundle or a regression in the engine the Action wraps.
External consumers are pointed at `@v0` from `README.md` and `docs/github-action.md`.

## Vercel deployment

| Setting               | Value                                   |
| --------------------- | --------------------------------------- |
| Account/scope         | `jacobisepic` / `jacobisepics-projects` |
| Project               | `playbookdiff`                          |
| Root Directory        | `website`                               |
| Framework             | Next.js                                 |
| Install Command       | `npm ci`                                |
| Build Command         | `npm run build`                         |
| Output Directory      | Next.js default                         |
| Node.js               | 24.x                                    |
| Environment variables | None                                    |
| Custom domain         | None                                    |
| Production branch     | `main`                                  |
| Production URL        | <https://playbookdiff.vercel.app>       |

Root Directory is set on the Vercel project itself, so Git-triggered builds use `website/` rather than the monorepo root.
`.vercel/` and `.env*` are both ignored, so the CLI's project link metadata and the `VERCEL_OIDC_TOKEN` it writes into `website/.env.local` stay local.

### Maintenance workflow

Normal operation is Git-driven: push to `main` deploys production, and a branch or pull request produces a preview.
The Vercel CLI is for initial setup, inspection, and explicit troubleshooting only.
Do not routinely run `vercel deploy --prod` alongside the Git integration; that produces duplicate builds for the same commit.

## Launch metrics baseline

Captured September 1, 2026 from public GitHub metadata.
Zero is the honest starting value and is recorded as such.

| Signal                   | Value                                       |
| ------------------------ | ------------------------------------------- |
| Stars                    | 0                                           |
| Forks                    | 0                                           |
| Open issues              | 0                                           |
| Open pull requests       | 0                                           |
| Releases                 | 1 (`v0.1.0`)                                |
| Contributors             | 1 (`JacobisEpic`); no external contributors |
| Repository created       | 2026-08-28                                  |
| Made public              | 2026-09-01                                  |
| `v0.1.0` published       | 2026-09-01T20:15:05Z                        |
| Website production URL   | <https://playbookdiff.vercel.app>           |
| Action public smoke test | Pass and fail scenarios both verified       |

No analytics were installed, and no traffic or download metrics exist.
Package downloads are unavailable because the CLI is not published to npm.
Action adoption is unmeasured; no third-party usage is claimed.

## Remaining

- [ ] Owner reviews the [Vercel OSS application draft](vercel-oss-application.md), supplies the personal fields, and submits it before the verified September 13 deadline.

Everything else on the original checklist is complete.
npm publication and a custom domain remain deliberately out of scope.
