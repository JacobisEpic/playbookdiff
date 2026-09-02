# Security policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately, not in a public issue.

Use GitHub's private vulnerability reporting on this repository: open the **Security** tab and choose **Report a vulnerability**.
That creates a private advisory visible only to the maintainers.

If private reporting is not available to you, open a public issue that says only that you have a security report and asks for a private channel.
Do not include details, reproduction steps, or affected configuration in that issue.

Please include, in the private report:

- what an attacker can do, and what they need in order to do it
- a minimal reproduction, ideally a small repository layout and the exact command
- the PlaybookDiff commit or version you observed it on

## Scope

PlaybookDiff analyzes repository configuration and is designed to hold these properties, described in full in [the security model](docs/security.md):

- it does not write to an analyzed repository
- it does not execute code from an analyzed repository, including Git hooks
- it does not connect to MCP servers, call a model, or fetch from a remote
- it does not resolve secret values, and never serializes them
- it does not follow paths outside the repository boundary it was given
- it does not emit host paths in findings or machine-readable output

A reproducible violation of any of those is a security issue, not a bug report.
So is any way to make the analyzer emit a credential, or to reach code execution through a crafted repository.

Findings themselves are not vulnerabilities: a compatibility finding describes a configuration difference under stated assumptions and carries no claim about the analyzed project's security.

## Supported versions

Security fixes are provided for the latest `0.x` release and the `main` branch.
Reporters using older `0.x` versions may be asked to upgrade before a report is investigated.
