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
The root repository's pnpm scripts are not involved in building or serving the site; they are involved in regenerating the two inputs described under [Generated inputs](#generated-inputs).

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
They verify homepage content and ordering, the install and Action commands, metadata and the canonical origin, anchor links, the generated example's agreement with the analyzer, every documentation route, link rewriting, and dependency isolation.
Lint includes React and accessibility rules.

## Routes

| Route          | What it is                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| `/`            | The homepage: hero, the interactive effective-configuration example, surfaces, usage, guarantees, FAQ. |
| `/docs`        | Documentation index and install instructions.                                                          |
| `/docs/<slug>` | One repository document, rendered. `lib/docs.ts` maps slugs to source files.                           |
| `/sitemap.xml` | Every published route, on the canonical origin.                                                        |
| `/robots.txt`  | Allow all, with the sitemap.                                                                           |

The homepage and every documentation route are prerendered at build time.
The effective-scope map, video playback, command copying, and FAQ behavior are small client components.
The homepage itself remains a server component.

## Generated inputs

Two files in this directory are generated from the repository, never hand-edited.
Both are regenerated together from the repository root:

```sh
pnpm website:sync         # rewrite both
pnpm website:sync:check   # fail if either is stale
```

### `content/docs/`

A byte-for-byte mirror of the repository's `docs/` directory, written by [`scripts/sync-website-docs.mjs`](../scripts/sync-website-docs.mjs).
`docs/` stays the single source of truth; the mirror exists because the site builds from this directory with its own lockfile, so the deployment cannot rely on reaching outside it.
`tests/docs.test.mjs` compares the mirror against `docs/` and fails if they diverge, so documentation cannot drift between GitHub and the website.

`lib/markdown.ts` renders that Markdown at build time.
It is a small renderer covering the constructs these documents actually use, so first-party docs need no documentation framework and no runtime Markdown dependency.
`lib/docs.ts` maps repository paths to website slugs and rewrites links: a document with a first-party route becomes an internal link, anchors included, and everything else keeps pointing at GitHub.
Every documentation page carries a "View source on GitHub" link to its own Markdown file.

### `lib/effective-scope.json`

The data behind the interactive example, written by [`scripts/generate-website-example.mjs`](../scripts/generate-website-example.mjs) from real `playbookdiff check --json` output against the checked-in [`cwd-target` fixture](../packages/harness-codex/test/fixtures/cross-harness/cwd-target).
It holds one row per configuration file with the state each launch directory produced, both runs' findings, and both runs' verbatim terminal transcripts.

The website does not import, reimplement, or execute the comparator, and it states no harness behaviour of its own: every state shown comes from Claude Code's `loadPhase` and Codex's `discovery.state` in the analyzer's own output.
Fixture and test evidence links are pinned to a commit so a concurrent change cannot silently alter the example's meaning.
The generator owns that pin and refuses to write the file unless every cited fixture and test file is byte-identical at it, so the example can never describe current behaviour while linking to evidence that no longer produces it.
Verifying the pin needs the commit in the local clone, which is why the workspace CI job checks out full history.
Finding ID prefixes are deliberately shortened, not presented as executable complete IDs.

## Vercel deployment

The site is deployed as the `playbookdiff` Vercel project, Git-connected to `JacobisEpic/playbookdiff`.
A push to `main` produces the production deployment; a branch or pull request produces a preview.
The Vercel CLI is for setup, inspection, and troubleshooting only - running `vercel deploy --prod` alongside the Git integration just duplicates a build for the same commit.

The production project uses these settings:

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
`turbopack.root` and `outputFileTracingRoot` are explicitly scoped to this directory, and the build reads nothing above it.
`.vercel/` and `.env*` are ignored, so the CLI's project link metadata and the `VERCEL_OIDC_TOKEN` it writes stay local.

## Canonical URL and social previews

The canonical public origin is <https://playbookdiff.dev>.
`productionOrigin` in `lib/site.ts` holds it and drives `metadataBase`, every canonical link, `og:url`, and the sitemap.
Vercel's own deployment alias still serves the project behind that domain, but it is not the site's identity and must not appear in rendered output; `tests/site.test.mjs` asserts the canonical and `og:url`, and fails if any rendered route or the sitemap mentions a `vercel.app` host.
Never set `productionOrigin` to a localhost address or a deployment-specific preview URL.

`app/opengraph-image.png` is the social preview card, regenerated by [`scripts/generate-og-image.py`](scripts/generate-og-image.py) from this project's own typefaces and brand artwork.
Next's file convention turns it into `og:image` and `twitter:image` with absolute URLs; do not declare those in `app/layout.tsx` as well.

## Content boundaries

The site describes the current deterministic engine, harness adapters, the `playbookdiff` CLI on npm, the released GitHub Action, and Git regression analysis.
The Action is shown with its real usage, `uses: JacobisEpic/playbookdiff@v0`, alongside the `fetch-depth: 0` its `diff` engine genuinely requires.
It does not claim adoption metrics, semantic analysis, behavioral equivalence, or any harness support beyond Claude Code and Codex.
Repository links point at the public repository.
The homepage presents the recorded walkthrough directly after the hero, before the optional effective-scope explanation.
The recording only loads when requested, and `tests/site.test.mjs` rejects unfinished placeholders.

## Design system

The page is warm neutral throughout, and exactly one hue is declared.
`--signal-on-dark` and `--signal-leader` mean one thing: PlaybookDiff proved a difference.
The route map uses the darker signal against paper for missing nodes, broken paths, and the finding; literal terminal output keeps its dark surface.
Everything else, including both agents, every received row, every link, button, and focus ring, is paper and ink.
Switching the example to the aligned launch directory removes the finding color.

There is deliberately no agent brand colour.
The two agents are told apart by their own icons and their names, never by recolouring type, and `tests/site.test.mjs` asserts that no `--claude` or `--codex` token comes back.
Monospace is used only where the content is literally a command, a path, or tool output.
See [`public/brand/README.md`](public/brand/README.md) for the artwork rules.

### Effective-scope interaction

The map has no scroll listeners, sticky scene, numbered phases, or timeline.
Both agents and both launch scenarios are immediately selectable.
Hovering, focusing, or tapping an agent selects it until another selection is made.
The START marker moves between the repository root and the nested directory when the launch location changes.
The instruction routes still include any parent configuration the generated data says is received.

Every configuration node, directory, route stopping point, and result comes from the generated example.
Skills use their directory basename on the map; complete paths, state labels, findings, and transcripts remain available in the evidence disclosures.
The target remains the generated target, including when instruction discovery stops earlier.
Hovering, focusing, or tapping a node updates one contextual annotation and highlights the inspected node.
The annotation sits beside the map on desktop and underneath it on phones, so it never covers a route.
Reduced motion disables the route, marker, and annotation transitions.
