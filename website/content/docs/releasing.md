# Release process

PlaybookDiff has two distribution surfaces with different mechanics:

- the npm CLI package built from `packages/cli`
- the GitHub Action committed at `packages/action/dist/index.mjs` and selected by Git tags

Publishing is intentionally manual.
CI builds and installs the npm tarball, verifies its contents, and checks the committed Action bundle, but it does not publish either surface.

## Release prerequisites

Release from a clean `main` branch after it matches `origin/main`.
Use the Node.js and pnpm versions declared by `.nvmrc` and `package.json`.
The npm account must have publish access to the unscoped `playbookdiff` package and satisfy npm's current two-factor authentication requirements.

Choose a version that has never been published or tagged.
`v0.1.0` is a GitHub Action release with no npm counterpart, and `v0.2.0` is the first npm publication; never reuse either number from a different commit.

npm freezes a version's README and manifest at publish time, and they cannot be edited afterwards.
So `packages/cli/README.md` and `packages/cli/package.json` must already say what the release should say - in particular its installation instructions and `homepage` - at the commit being tagged, not on `main` afterwards.

Update the version in these manifests together:

- `packages/cli/package.json`
- `packages/core/package.json`
- `packages/harness-claude/package.json`
- `packages/harness-codex/package.json`
- `packages/action/package.json`
- `website/package.json`
- `website/package-lock.json`
- `website/lib/site.ts`

The root workspace stays at private version `0.0.0`.
Run `pnpm install --lockfile-only` and `npm install --package-lock-only` from `website/` after version edits so both lockfiles remain consistent.

## Validate the release candidate

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm fmt:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm cli:third-party-notices
pnpm action:build
pnpm cli:verify-package
```

Then validate the standalone website:

```sh
cd website
npm ci
npm run lint
npm run typecheck
npm run build
npm test
cd ..
```

`pnpm cli:third-party-notices` regenerates the license notices from the exact third-party packages represented in the built CLI source map.
`pnpm cli:verify-package` builds the CLI, verifies those notices, creates an npm tarball in a temporary directory, restricts the package to its declared public files, installs it offline into a clean consumer project with lifecycle scripts disabled, runs `playbookdiff --help`, and analyzes a parity fixture.
It also requires the installed manifest to have zero runtime dependencies, which prevents any `workspace:*` reference or missing registry dependency from reaching consumers.

Review the regenerated `packages/action/dist/index.mjs`, stage it with the rest of the intended release, then run `pnpm action:verify-bundle`.
That check rebuilds the bundle and rejects any worktree difference from the staged artifact; in CI, it proves the committed artifact matches source.

Review `npm pack --dry-run` from `packages/cli` as a final human-readable content check.
The package should contain only `LICENSE`, `README.md`, `THIRD_PARTY_NOTICES.md`, `package.json`, and `dist/**`.

## Commit and tag

Commit the version changes and regenerated Action bundle before publishing.
Push `main`, wait for conventional CI and the PlaybookDiff dogfood workflow to pass, then create and push an annotated exact-version tag:

```sh
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

Create a GitHub release from that exact tag.
Release notes must describe verified behavior and known limitations without adoption claims.

The `v0` Action tag is a movable compatibility tag.
After the exact tag is published and verified, move `v0` to the same commit and update the remote tag explicitly:

```sh
git tag -f v0 vX.Y.Z
git push --force origin refs/tags/v0
```

This force-updates only the documented movable tag.
Never force-push a branch or an exact-version tag.

## Publish the CLI to npm

Authenticate and verify the target before publishing:

```sh
npm whoami
npm view playbookdiff
```

From the exact tagged commit, publish only the CLI package:

```sh
cd packages/cli
npm publish --access public
cd ../..
```

Do not run `pnpm publish -r` or publish any `@playbookdiff/*` workspace package.
Those packages are private build units and their runtime code is bundled into the CLI artifact.

Verify the registry result without relying on a local checkout:

```sh
npm view playbookdiff@X.Y.Z version dist.tarball
npm exec --yes --package=playbookdiff@X.Y.Z -- playbookdiff --version
npm exec --yes --package=playbookdiff@X.Y.Z -- playbookdiff --help
```

If any of those commands fail, treat the release as unverified and fix it before announcing the version anywhere.

## Release checklist

The exact manual steps, in order:

1. Choose the next unused release version and update the version files listed above.
2. Confirm `packages/cli/README.md` and `packages/cli/package.json` already carry the final published copy, because npm freezes both at publish time.
3. Regenerate both lockfiles and the committed Action bundle.
4. Run the complete root, website, Action, and npm-tarball validation suites.
5. Commit and push the release candidate to `main`.
6. Wait for both GitHub workflows to pass.
7. Create and push the exact `vX.Y.Z` tag and create its GitHub release.
8. Move the `v0` tag to that exact release commit.
9. Run `npm whoami` and confirm package-name access.
10. Run `npm publish --access public` from `packages/cli`.
11. Verify the published version and installed CLI directly from npm.
