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

This task did not create or deploy a Vercel project.
After the owner has reconciled this branch and approved deployment:

1. Import the GitHub repository into a Vercel project.
2. Set **Root Directory** to `website`.
3. Set **Framework Preset** to `Next.js`.
4. Set **Install Command** to `npm ci`.
5. Set **Build Command** to `npm run build`.
6. Leave **Output Directory** at the Next.js default.
7. Select **Node.js 24.x**.
8. Leave environment variables empty.
9. Keep access to files outside the root directory disabled.
10. Use the isolated branch for a preview only if the owner chooses, then select the integrated branch for production.

The local npm lockfile pins dependencies independently from the monorepo.
`turbopack.root` and `outputFileTracingRoot` are explicitly scoped to this directory.
The homepage is prerendered at build time; the fixture selector is the only client component.
Vercel can create preview deployments for website pull requests without a database or external service.

## Canonical URL and social previews

Title, description, Open Graph text, Twitter text, and a small SVG favicon are implemented.
No production domain has been chosen or claimed.
Set `productionOrigin` in `lib/site.ts` to the verified HTTPS production origin after deployment, then rebuild to emit canonical and Open Graph URLs.
Do not use a localhost or temporary preview origin as the canonical URL.
Social image metadata is deliberately omitted until a canonical deployment exists; a future simple branded image can be added without changing the page architecture.
The metadata test currently asserts the pre-deployment state and must be updated when the production origin is set.

## Fixture data, not browser analysis

`lib/examples.json` is a hand-curated presentation of the assertions in `packages/harness-codex/src/cross-harness.test.ts` at commit `2cdda6b15f30b12d26d6dee0fa5462aa88a60b6f`.
The source links are pinned to that baseline so concurrent changes cannot silently alter the example's meaning.
Scenario A has two medium findings, while Scenario B has one medium instruction scope gap.
The remaining scope gap is intentional: the baseline IR represents Claude applicability as `.` and Codex applicability as `apps/api`.
The website does not import, reimplement, or execute the comparator.
Finding ID prefixes are explicitly shortened, not presented as executable complete IDs.

## Content boundaries

The site describes Phase 6 capabilities only.
It does not claim a released GitHub Action, published npm package, public repository, adoption metrics, semantic analysis, or behavioral equivalence.
Repository links may require access until the owner makes the project public.
Claude's Phase 7 work is complete separately on `main` but is not included in this branch.
See `launch/post-merge-integration.md` for the owner-authorized reconciliation steps after this branch is finished.
