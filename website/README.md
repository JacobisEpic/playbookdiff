# PlaybookDiff website

A standalone Next.js 16.3.3 App Router project with React 19.2.8 and TypeScript.
Only this directory is needed to install, validate, build, and serve the site.
There are no workspace package imports, required environment variables, remote fonts, analytics, API keys, or backend services.

## Local development

Use Node 24.11 or newer within the 24.x release line and npm.

```sh
cd website
npm ci
npm run dev
```

Open the local URL printed by Next.js.
The root repository's pnpm scripts are not involved.

## Validation

```sh
npm ci
npm run typecheck
npm run lint
npm run build
npm test
npm start
```

Tests read the production-rendered HTML, so build before running them.
They verify content, commands, metadata, anchor links, fixture data, source-path safety, and dependency isolation.
Lint includes React and accessibility rules.
The example buttons require a browser interaction check in addition to these lightweight tests.

## Vercel deployment

The site is deployed as the `playbookdiff` Vercel project, Git-connected to `JacobisEpic/playbookdiff`.
A push to `main` produces the production deployment at <https://playbookdiff.vercel.app>; a branch or pull request produces a preview.
The Vercel CLI is for setup, inspection, and troubleshooting only - running `vercel deploy --prod` alongside the Git integration just duplicates a build for the same commit.

Project settings, recorded in `launch/public-launch-checklist.md`:

| Setting          | Value           |
| ---------------- | --------------- |
| Root Directory   | `website`       |
| Framework        | Next.js         |
| Install Command  | `npm ci`        |
| Build Command    | `npm run build` |
| Output Directory | Next.js default |
| Node.js          | 24.x            |
| Environment      | No variables    |

The local npm lockfile pins dependencies independently from the monorepo.
`turbopack.root` and `outputFileTracingRoot` are explicitly scoped to this directory.
The homepage is prerendered at build time; the fixture selector is the only client component.
`.vercel/` and `.env*` are ignored, so the CLI's project link metadata and the `VERCEL_OIDC_TOKEN` it writes stay local.

## Canonical URL and social previews

Title, description, Open Graph text, Twitter text, and a small SVG favicon are implemented.
`productionOrigin` in `lib/site.ts` is the verified stable production origin, <https://playbookdiff.vercel.app>, and drives `metadataBase`, the canonical link, and `og:url`.
Never set it to a localhost address or to a deployment-specific preview URL; `tests/site.test.mjs` asserts the rendered canonical and `og:url` and rejects any other `*.vercel.app` host, so a regression fails the build gate rather than shipping quietly.
Social image metadata is deliberately omitted; a future simple branded image can be added without changing the page architecture.

## Fixture data, not browser analysis

`lib/examples.json` is a hand-curated presentation of the assertions in `packages/harness-codex/src/cross-harness.test.ts` at commit `2cdda6b15f30b12d26d6dee0fa5462aa88a60b6f`.
Fixture evidence links are pinned to that baseline so concurrent changes cannot silently alter the example's meaning.
Documentation and project links follow the current `main` branch.
Scenario A has two medium findings, while Scenario B has zero findings and four equivalent entities.
Changing only `cwd` from `.` to `apps/api` brings the nested instruction and skill into Codex's discovery chain.
The website does not import, reimplement, or execute the comparator.
Finding ID prefixes are explicitly shortened, not presented as executable complete IDs.

## Content boundaries

The site describes the current deterministic engine, harness adapters, CLI, released GitHub Action, and Git regression analysis.
The Action is shown with its real usage, `uses: JacobisEpic/playbookdiff@v0`, because `v0.1.0` and the movable `v0` tag are published and the Action was smoke-tested from an unrelated public repository.
It does not claim a published npm package, adoption metrics, semantic analysis, or behavioral equivalence.
Repository links point at the public repository and are verified anonymously.
The CI regression visual is based on the checked-in baseline-debt-plus-new-regression fixture.
