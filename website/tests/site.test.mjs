import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const html = await readFile(path.join(root, ".next/server/app/index.html"), "utf8");
const examples = JSON.parse(await readFile(path.join(root, "lib/examples.json"), "utf8"));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

test("production homepage states the product job and primary actions immediately", () => {
  assert.match(html, /Keep Claude Code and/);
  assert.match(html, /Codex/);
  assert.match(html, /in sync./);
  assert.match(
    html,
    /PlaybookDiff checks what each agent actually receives and catches configuration gaps before they land/,
  );
  assert.match(html, /See an example/);
  assert.match(html, /View on GitHub/);
  assert.ok(html.includes("https://github.com/JacobisEpic/playbookdiff"));
});

test("the simple regression appears before the discovery edge case", () => {
  const simple = html.indexOf("This pull request adds");
  const deep = html.indexOf("Sometimes both files exist");
  assert.ok(simple >= 0, "simple regression");
  assert.ok(deep >= 0, "discovery demo");
  assert.ok(simple < deep, "simple regression must teach the product first");
  for (const phrase of [
    ".claude/skills/deploy/SKILL.md",
    "no corresponding skill",
    "Skill capability gap",
    "CI fails",
  ]) {
    assert.ok(html.includes(phrase), phrase);
  }
});

test("the homepage separates checked surfaces from run modes", () => {
  assert.match(html, /More than a/);
  assert.match(html, /CLAUDE.md/);
  assert.match(html, /AGENTS.md/);
  assert.match(html, /Matching files do not guarantee matching effective configuration/);
  for (const surface of [
    "Instructions",
    "Skills",
    "MCP servers",
    ".claude/skills/",
    ".agents/skills/",
    ".mcp.json",
    ".codex/config.toml",
  ]) {
    assert.ok(html.includes(surface), surface);
  }
  assert.doesNotMatch(html, /Git revisions/);
});

test("local and pull-request workflows are concise and honest", () => {
  assert.ok(html.includes("playbookdiff check ."), "local command");
  assert.ok(html.includes("uses: JacobisEpic/playbookdiff@v0"), "Action reference");
  assert.match(html, /Existing debt stays green/);
  assert.doesNotMatch(html, /npm (?:i |install )(?:-g )?playbookdiff|npx playbookdiff/);
});

test("example data preserves the checked-in A/B assertions", () => {
  assert.equal(examples.baseline, "2cdda6b15f30b12d26d6dee0fa5462aa88a60b6f");
  assert.equal(examples.root.count, 2);
  assert.equal(examples.api.count, 0);
  assert.equal(examples.root.equivalent, 2);
  assert.equal(examples.api.equivalent, 4);
  assert.deepEqual(examples.root.codex.notReceived, ["apps/api/AGENTS.md", "api-skill"]);
  assert.deepEqual(examples.api.codex.notReceived, []);
  assert.deepEqual(
    examples.root.findings.map((finding) => finding.type),
    ["missing", "capability-gap"],
  );
  assert.deepEqual(
    examples.api.findings.map((finding) => finding.type),
    [],
  );
  for (const scenario of [examples.root, examples.api]) {
    assert.equal(scenario.count, scenario.findings.length);
  }
});

test("the deep demo is fixture-backed and interactive", () => {
  assert.match(html, /Where the agent was started/);
  assert.match(html, /Repository root/);
  assert.ok(html.includes("apps/api"));
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /One agent is missing part of the playbook/);
  assert.ok(html.includes(examples.root.count + " findings"));
  assert.match(html, /checked-in test/);
  for (const node of examples.tree.nodes) {
    assert.ok(html.includes(node.name), node.name);
  }
});

test("the cleared interactive scenario ships in the client bundle", async () => {
  const chunks = path.join(root, ".next/static/chunks");
  const sources = await Promise.all(
    (await readdir(chunks, { recursive: true }))
      .filter((entry) => entry.endsWith(".js"))
      .map((entry) => readFile(path.join(chunks, entry), "utf8")),
  );
  for (const phrase of [
    "Both agents got the same playbook",
    "All four instructions and skills match on both sides.",
  ]) {
    assert.ok(
      sources.some((source) => source.includes(phrase)),
      phrase,
    );
  }
});

test("trust claims stay concrete and evidence-based", () => {
  for (const phrase of [
    "Evidence,",
    "not",
    "guesses.",
    "Read-only",
    "No project execution",
    "Secrets stay unresolved",
    "Unknown beats guessed",
    "Never runs scripts, skills, binaries, hooks, or MCP servers",
    "not found",
  ]) {
    assert.ok(html.includes(phrase), phrase);
  }
});

test("provenance contains only repository-relative evidence paths", () => {
  for (const scenario of [examples.root, examples.api]) {
    for (const finding of scenario.findings) {
      assert.ok(finding.evidence.length > 0);
      for (const evidence of finding.evidence) {
        assert.equal(path.isAbsolute(evidence), false);
        assert.equal(evidence.includes(".."), false);
      }
    }
  }
});

test("local anchor links point to existing IDs", () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const links = [...html.matchAll(/\bhref="#([^"]+)"/g)].map((match) => match[1]);
  assert.ok(links.length >= 6);
  for (const link of links) {
    assert.ok(ids.has(link), "Missing anchor " + link);
  }
});

test("metadata uses the verified origin and concise browser title", () => {
  for (const name of [
    "description",
    "og:title",
    "og:description",
    "twitter:title",
    "twitter:description",
  ]) {
    assert.ok(html.includes('="' + name + '"'), name);
  }
  assert.match(html, /<title>PlaybookDiff<\/title>/);
  assert.doesNotMatch(html, /<title>PlaybookDiff \|/);
  assert.ok(html.includes('<link rel="canonical" href="https://playbookdiff.vercel.app"'));
  assert.ok(html.includes('property="og:url" content="https://playbookdiff.vercel.app"'));
  assert.doesNotMatch(html, /(?:content|href)="https?:\/\/(?:localhost|127\.0\.0\.1)/);
});

test("semantic structure and brand assets are present", () => {
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  assert.match(html, /<html lang="en"/);
  assert.match(html, /Skip to content/);
  assert.match(html, /src="\/brand\/mascots-reading\.png"[^>]*alt=""/);
  assert.match(html, /src="\/brand\/wordmark-on-dark\.png"[^>]*alt="PlaybookDiff"/);
  assert.match(html, /src="\/brand\/claude_logo\.png"[^>]*alt=""/);
  assert.match(html, /src="\/brand\/codex_logo\.png"[^>]*alt=""/);
  assert.match(html, /rel="icon"[^>]*\/icon\.png/);
});

test("website dependencies remain standalone and minimal", () => {
  assert.deepEqual(Object.keys(packageJson.dependencies).sort(), ["next", "react", "react-dom"]);
  assert.equal(JSON.stringify(packageJson).includes("workspace:"), false);
});

test("source has no host paths, external fonts, required environment, or model calls", async () => {
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await inspect(filename);
      } else {
        const content = await readFile(filename, "utf8");
        assert.doesNotMatch(
          content,
          /\/Users\/|\/private\/tmp\/|process\.env|next\/font|@import\s+url/,
        );
      }
    }
  }
  for (const directory of ["app", "components", "lib"]) {
    await inspect(path.join(root, directory));
  }
});
