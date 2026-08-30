# Public launch checklist

Evidence date: August 29, 2026, with program terms, repository visibility, description, homepage, topics, stars, forks, and release status rechecked on August 30.
Source baseline: `1bb3384`; live GitHub metadata was read without changing settings.
Claude's Phase 7 is now complete separately on `main`; reconciliation and release verification remain pending, and none of its code is included here.
Status vocabulary: **already satisfied**, **needs work**, **pending post-branch reconciliation**, **human action required**.

## Blockers

| Item                       | Current state                                                                    | Required action                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public repository          | Human action required: GitHub reports `isPrivate: true`.                         | Review source/history for secrets and private information, then have the owner make the repository public before applying.                                            |
| Vercel deployment          | Human action required: deployment-ready code only; no project or domain created. | After integration, deploy with root `website` using `website/README.md`; verify the anonymous URL.                                                                    |
| Application evidence links | Needs work: GitHub links are currently access-restricted.                        | Check repository, license, community files, docs, and demo in a signed-out browser after launch.                                                                      |
| Application submission     | Human action required: draft prepared, not submitted.                            | Verify the [official deadline](https://vercel.com/open-source-program), complete personal fields, and submit before September 13; exact cutoff time was not verified. |

## High priority

| Item                     | Current state                                                                                                     | Required action                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Repository description   | Needs work: empty.                                                                                                | Apply a description from `project-positioning.md` after owner approval.                                                              |
| Homepage                 | Needs work: empty.                                                                                                | Set the verified production website URL after deployment.                                                                            |
| Topics                   | Needs work: none returned.                                                                                        | Use the proposed relevant lowercase topics; add `github-actions` only after the integration is verified.                             |
| MIT license              | Already satisfied: `LICENSE` and GitHub license metadata identify MIT.                                            | Recheck public visibility after launch.                                                                                              |
| Code of Conduct          | Already satisfied: `CODE_OF_CONDUCT.md` defines community standards.                                              | Verify its private reporting mechanism works; it currently refers to GitHub security advisories, whose availability was not checked. |
| Contributing guide       | Already satisfied: setup, evidence rules, fixture expectations, and PR guidance exist.                            | Add website-specific contributor guidance later if needed; this branch does not edit the root guide.                                 |
| README                   | Already satisfied for Phase 6 CLI and Git diff; needs final integration review.                                   | Claude/owner should reconcile CI/release status and link the deployed website.                                                       |
| GitHub Action            | Pending post-branch reconciliation: Phase 7 complete separately on `main`, not included or claimed released here. | Independently review functionality, permissions, packaging, documentation, and release process after integration.                    |
| Release/tag              | Needs work: no tags in the baseline and no GitHub releases returned.                                              | Publish a tested release and a real installation path; verify registry ownership before recommending package installation.           |
| CLI/package distribution | Needs work: source build documented; public installation unverified.                                              | Test from a clean consumer environment and update website wording only when supported.                                               |
| Screenshot/demo          | Already satisfied in code: fixture selector and source links; visual QA recorded in `validation.md`.              | Capture approved launch screenshots from the final deployed page, excluding internal launch documents.                               |
| Example use case         | Already satisfied: checked-in cwd/target fixture changes two findings to one.                                     | Add a real independent repository case with permission before citing external use.                                                   |
| Application copy         | Already satisfied: prepared in `vercel-oss-application.md`.                                                       | Replace status-sensitive paragraphs with verified post-integration facts.                                                            |
| Metrics baseline         | Already satisfied for snapshot: 0 stars, 0 forks, one listed contributor, no releases.                            | Capture a dated public baseline; other usage and download metrics remain unavailable.                                                |
| Public announcement      | Needs work: draft in `project-positioning.md`.                                                                    | Publish only after links and installation instructions work anonymously.                                                             |
| Feedback channels        | Needs work: contributor guide exists, but public access is blocked.                                               | Verify public Issues and PR workflows after launch; test private conduct/security reporting separately.                              |

## Nice to have

| Item                               | Current state                                                             | Recommended action                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Issue templates                    | Needs work: no `.github` templates in baseline.                           | Check the integrated tree first, then add a minimal configuration-reproduction template only if still missing. |
| Security policy                    | Needs work: no `SECURITY.md` in baseline.                                 | Publish safe private vulnerability-reporting instructions, especially for untrusted repository inputs.         |
| Canonical/social image             | Needs work: no production origin chosen; text metadata and favicon exist. | Set the verified canonical origin and consider a simple social image after deployment.                         |
| Website measurement                | Deliberately absent.                                                      | Consider privacy-conscious measurement only after explicit owner approval; no analytics SDK is installed.      |
| Additional harnesses/report viewer | Future evaluation only.                                                   | Prioritize real demand and deterministic evidence; do not promise delivery to strengthen an application.       |

## Final submission gate

- [ ] Repository, source, license, and community documents are publicly accessible.
- [ ] Website is deployed and all primary links work signed out.
- [ ] Release and Action claims match integrated, tested code.
- [ ] No invented adoption, downloads, users, or contributor counts appear in copy.
- [ ] Credits plan is limited to the OSS project.
- [ ] Application terms and deadline were checked again on the live official page.
- [ ] Owner reviewed and submitted the application personally.
