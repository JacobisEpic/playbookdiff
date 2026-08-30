# PlaybookDiff positioning kit

Prepared against Phase 6 baseline `1bb3384`.
Use public-launch copy only after source access and release instructions are verified.
Do not claim Vercel program membership, released GitHub Action support, or adoption that has not been established.

## One-line descriptions

- Detect repository-configuration drift between Claude Code and Codex.
- See the instructions and capabilities each coding harness receives from the same repository.
- Catch newly introduced agent-configuration regressions without failing on existing debt.

## Suggested GitHub description

Deterministic Claude Code ↔ Codex configuration drift detection.
Compare instructions, skills, MCP, scope, and Git regressions with source evidence.

## 50-word description

PlaybookDiff detects repository-configuration drift between Claude Code and Codex.
It compiles each harness's instructions, skills, MCP configuration, and scope into a shared model, then reports deterministic differences with source evidence.
Its CLI compares Git revisions to identify newly introduced regressions, without failing on pre-existing debt or promising identical agent behavior.

## 150-word description

PlaybookDiff is a tool for repositories that use both Claude Code and Codex.
The two harnesses discover instructions, skills, and MCP configuration differently, so similar files can produce different effective setups.

Harness adapters compile repository-defined configuration into a shared model with source provenance.
A deterministic comparator identifies missing capabilities, scope differences, and structured configuration drift.
When instruction wording differs but compatibility cannot be proved, it reports uncertainty instead of inventing a conflict.

The CLI supports checking a repository, explaining a finding, and comparing Git revisions.
Stable finding IDs separate introduced, resolved, and unchanged findings, allowing teams to reject new actionable regressions without blocking on pre-existing debt.

PlaybookDiff is MIT licensed and designed for local analysis without model API keys.
It does not run coding agents, synchronize configuration files, resolve secrets, or promise identical model behavior.
Maintainers can inspect its rules and contribute reproducible fixtures as harness behavior evolves over time.

## Vercel application version

PlaybookDiff brings an evidence-driven compatibility layer to multi-agent repositories.
It has a working deterministic engine, two adapters, a CLI, and Git regression analysis, with an extensible fixture-based approach to harness semantics.
The proposed Vercel usage is concrete: a public project website, documentation and examples, and preview deployments for community contributions.
The project is early-stage, so the case is growth potential and technical substance, not unverified adoption.

## Developer-launch version

Using Claude Code and Codex in the same repo?
They may not discover the same playbook.

PlaybookDiff compares repository-defined instructions, skills, MCP configuration, and scope.
Run `check` to see the differences, `explain` to follow the evidence, or `diff main..HEAD` to find newly introduced regressions.
The example on the project site shows why changing the launch directory from `.` to `apps/api` changes the report from two findings to one.
It is read-only and deterministic: different prose stays unknown unless compatibility can actually be proved.

Launch links: use the verified public repository and deployed site URL only.
Do not announce npm installation or a released Action until independently tested.

## Key differentiators

| Alternative                               | What it helps with             | What PlaybookDiff adds                                                                    |
| ----------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| Manually copying configuration            | Reuses text.                   | Compares effective discovery, scope, and configured capabilities, not only file contents. |
| Symlinking native files                   | Keeps some source text shared. | Identifies remaining harness-specific interpretation and capability differences.          |
| One generic instruction file              | Centralizes common guidance.   | Preserves native harness features while making differences reviewable.                    |
| Running both models and eyeballing output | Observes a particular run.     | Provides repeatable configuration analysis without model variability or execution.        |

These approaches can coexist.
PlaybookDiff is not a behavioral benchmark and does not replace runtime testing.

## Target audiences

- Maintainers supporting multiple coding agents in one repository.
- Teams defining repeatable agent-assisted development practices.
- Developers migrating between Claude Code and Codex.
- Contributors reviewing changes to nested instructions, skills, and MCP configuration.
- Tool builders contributing documented harness semantics and fixtures.

## Suggested GitHub topics

Initial set: `claude-code`, `codex`, `coding-agents`, `developer-tools`, `configuration`, `cli`, `typescript`, `mcp`.
Add `github-actions` only after the Action is integrated and released.
Avoid claiming a semantic-AI analyzer or unsupported harnesses through topics.
The lowercase/hyphen style follows [GitHub's topic guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics).
Use the owner-facing topic selector to confirm useful existing topic matches before saving; no metadata has been changed by this task.

## Suggested taglines

- Same repo.
  Different agents.
  Know the difference.
- Keep your native playbooks.
  Make the differences visible.
- Configuration compatibility, backed by evidence.
- Unknown is better than guessed.

## Copy guardrails

Say repository-defined configuration, not complete machine-effective state.
Say configured MCP capability, not verified runtime connectivity.
Say deterministic difference, not guaranteed behavioral impact.
Say growth hypothesis or future metric, not current adoption.
Keep `cwd` distinct from `targetPath` and committed revisions distinct from working-tree changes.
