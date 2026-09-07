// Generates the website's interactive effective-scope example from real
// analyzer output, so the page cannot drift away from what PlaybookDiff
// actually reports.
//
//   node scripts/generate-website-example.mjs           writes the file
//   node scripts/generate-website-example.mjs --check   fails if it is stale
//
// The source of truth is the checked-in `cwd-target` fixture and the built
// CLI. Nothing here restates harness behaviour; every state below is read out
// of `playbookdiff check --json`.

import { spawnSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const cli = path.join(repositoryRoot, "packages", "cli", "dist", "bin.js");
const fixture = path.join(
  "packages",
  "harness-codex",
  "test",
  "fixtures",
  "cross-harness",
  "cwd-target",
);
const test = path.join("packages", "harness-codex", "src", "cross-harness.test.ts");
const target = "apps/api/file.ts";
const output = path.join(repositoryRoot, "website", "lib", "effective-scope.json");

const scenarios = [
  { key: "root", cwd: "." },
  { key: "api", cwd: "apps/api" },
];

function playbookdiff(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    // No colour, so the captured transcript is exactly what a piped or CI run
    // produces rather than an escape-code soup.
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `playbookdiff ${args.join(" ")} exited ${String(result.status)}\n${result.stderr}`,
    );
  }
  return result.stdout;
}

// Every file in the fixture, so a path the analyzer never mentions still shows
// up in the tree. That absence is the point of the example.
async function fixtureFiles() {
  const root = path.join(repositoryRoot, fixture);
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)))
    .sort();
}

// A repository path belongs to whichever harness reads that location. These
// are the fixture's own file names, not an inference about harness behaviour.
function owner(file) {
  const segments = file.split("/");
  const name = segments.at(-1);
  if (segments.includes(".claude") || name === "CLAUDE.md") return "claude";
  if (segments.includes(".agents") || name === "AGENTS.md") return "codex";
  return null;
}

// A skill is one directory, not one file: the tree shows the skill folder the
// way a reader thinks about it, and SKILL.md is the evidence behind it.
function skillDirectory(file) {
  const match = file.match(/^(.*skills\/[^/]+)\//);
  return match ? `${match[1]}/` : null;
}

function displayPath(file) {
  return skillDirectory(file) ?? file;
}

// The four states the page distinguishes, each read straight out of the
// compiled configuration:
//
//   startup    the harness holds it from the moment the session starts
//   on-demand  the harness can reach it later, once it touches the work target
//   absent     the file exists and the harness never receives it in this context
//
// Claude Code's `loadPhase` and Codex's `discovery.state` already carry this
// distinction; nothing is inferred here.
function stateFor(config, file) {
  const directory = skillDirectory(file);

  for (const instruction of config.instructions) {
    if (instruction.source.path === file) {
      return { state: instruction.loadPhase === "startup" ? "startup" : "on-demand" };
    }
  }

  for (const skill of config.skills) {
    if (skill.path === file || (directory && skill.path.startsWith(directory))) {
      return {
        state: skill.discovery.state === "available" ? "startup" : "on-demand",
        reason: skill.discovery.reason,
      };
    }
  }

  return { state: "absent" };
}

function shortId(id) {
  const parts = id.split(":");
  return parts.slice(0, 3).join(":");
}

async function build() {
  const files = await fixtureFiles();
  const runs = {};

  for (const scenario of scenarios) {
    const args = ["check", fixture, "--cwd", scenario.cwd, "--path", target];
    const parsed = JSON.parse(playbookdiff([...args, "--json"]));
    runs[scenario.key] = {
      cwd: scenario.cwd,
      report: parsed.report,
      // The human transcript, verbatim, with the fixture path replaced by the
      // repository placeholder a reader would actually type.
      transcript: playbookdiff(args).replace(fixture, "your-repo").trimEnd(),
    };
  }

  // One row per configuration item, with the state each scenario produced for
  // it. A skill collapses to its own directory; the tree stays two levels deep
  // so it reads the same on a phone as on a desktop.
  const seen = new Set();
  const rows = [];
  for (const file of files) {
    const display = displayPath(file);
    if (seen.has(display)) continue;
    seen.add(display);

    const harness = owner(file);
    if (!harness) continue;

    const states = {};
    for (const scenario of scenarios) {
      const config = runs[scenario.key].report[harness === "claude" ? "left" : "right"];
      states[scenario.key] = stateFor(config, file).state;
    }

    // `apps/api/.claude/skills/api-skill/` sits in the `apps/api` group and is
    // named by the part a reader scans for.
    const directory = display.replace(/(^|\/)(\.claude|\.agents|CLAUDE\.md|AGENTS\.md).*$/, "");
    rows.push({
      path: display,
      directory: directory.replace(/\/$/, ""),
      name: display.slice(directory.length).replace(/^\//, ""),
      evidence: file,
      harness,
      kind: skillDirectory(file) ? "skill" : "instruction",
      states,
    });
  }

  // Repository order: the root group, then each nested directory; within a
  // group, the instruction pair before the skill pair, Claude Code first.
  const order = { instruction: 0, skill: 1 };
  rows.sort(
    (a, b) =>
      a.directory.split("/").length - b.directory.split("/").length ||
      a.directory.localeCompare(b.directory) ||
      order[a.kind] - order[b.kind] ||
      a.harness.localeCompare(b.harness),
  );

  return {
    // Regenerate with `pnpm website:example`; `--check` gates drift in CI.
    generatedBy: "scripts/generate-website-example.mjs",
    fixture,
    test,
    target,
    rows,
    scenarios: Object.fromEntries(
      scenarios.map(({ key }) => {
        const { cwd, report, transcript } = runs[key];
        const counts = report.summary.counts;
        const categories = report.summary.byCategory;
        return [
          key,
          {
            cwd,
            transcript,
            actionable: counts.high + counts.medium,
            equivalent: Object.values(categories).reduce((total, c) => total + c.equivalent, 0),
            findings: report.findings.map((finding) => ({
              id: shortId(finding.id),
              severity: finding.severity,
              category: finding.category,
              type: finding.type,
              explanation: finding.explanation,
              evidence: finding.evidence.map((item) => item.source.path),
            })),
          },
        ];
      }),
    ),
  };
}

const generated = `${JSON.stringify(await build(), null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(output, "utf8").catch(() => "");
  if (current !== generated) {
    console.error(
      `${path.relative(repositoryRoot, output)} is stale. Run \`pnpm website:example\` and commit the result.`,
    );
    process.exit(1);
  }
  console.log(`${path.relative(repositoryRoot, output)} matches the analyzer.`);
} else {
  await writeFile(output, generated);
  console.log(`Wrote ${path.relative(repositoryRoot, output)}`);
}
