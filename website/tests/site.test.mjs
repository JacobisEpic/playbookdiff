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
    /PlaybookDiff checks the instructions, skills, and MCP configuration each coding agent actually receives, and catches differences before they land/,
  );
  assert.match(html, /Get started/);
  assert.match(html, /View on GitHub/);
  assert.ok(html.includes("https://github.com/JacobisEpic/playbookdiff"));
  // Both run modes are visible above the fixture example, not only the CLI.
  assert.match(html, /CLI and GitHub Action/);
});

test("the illustrative ledger teaches the product before the discovery edge case", () => {
  const simple = html.indexOf(".claude/skills/deploy/");
  const deep = html.indexOf("Every file exists");
  assert.ok(simple >= 0, "illustrative ledger");
  assert.ok(deep >= 0, "fixture example");
  assert.ok(simple < deep, "the simple case must teach the product first");
  for (const phrase of ["not received", "Skill capability gap", "medium"]) {
    assert.ok(html.includes(phrase), phrase);
  }
  // The hero case is illustrative and says so, so it is never mistaken for
  // fixture-backed output.
  assert.match(html, /An illustrative repository/);
});

test("the homepage names every checked surface", () => {
  assert.match(html, /Matching files are not matching configuration/);
  for (const surface of [
    "Instructions",
    "Skills",
    "MCP servers",
    "CLAUDE.md",
    "AGENTS.md",
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
  assert.match(html, /v0\.2\.0/);
  assert.match(html, /Existing debt stays green/);
  assert.doesNotMatch(html, /npm (?:i |install )(?:-g )?playbookdiff|npx playbookdiff/);
});

test("example data preserves the checked-in A/B assertions", () => {
  assert.equal(examples.baseline, "2cdda6b15f30b12d26d6dee0fa5462aa88a60b6f");
  assert.equal(examples.root.count, 2);
  assert.equal(examples.api.count, 0);
  assert.equal(examples.root.equivalent, 2);
  assert.equal(examples.api.equivalent, 4);
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
  // Only the launch directory differs, so both scenarios compare the same
  // items and only the Codex side changes.
  assert.deepEqual(
    examples.root.ledger.map((row) => row.id),
    examples.api.ledger.map((row) => row.id),
  );
  assert.deepEqual(
    examples.root.ledger.map((row) => row.left),
    examples.api.ledger.map((row) => row.left),
  );
  assert.deepEqual(
    examples.root.ledger.filter((row) => row.right === null).map((row) => row.id),
    ["api-instruction", "api-skill"],
  );
  assert.equal(examples.api.ledger.filter((row) => row.right === null).length, 0);
});

test("the fixture example is rendered and interactive", () => {
  assert.match(html, /Where the agent was launched/);
  assert.match(html, /Repository root/);
  assert.ok(html.includes("apps/api"));
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /aria-pressed="false"/);
  assert.ok(html.includes(examples.target), "the target file the agent works on");
  assert.match(html, /checked-in fixture/);
  assert.match(html, /test that asserts both results/);
  for (const row of examples.root.ledger) {
    assert.ok(html.includes(row.left), row.left);
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
    "No divergence. Both agents hold the same instructions and the same skills.",
    examples.api.note,
  ]) {
    assert.ok(
      sources.some((source) => source.includes(phrase)),
      phrase,
    );
  }
});

test("trust claims stay concrete, evidence-based, and stated once", () => {
  for (const phrase of [
    "It reports what it can prove.",
    "Read-only",
    "No execution",
    "No model calls",
    "Unknown beats guessed",
    "Never runs scripts, skills, binaries, hooks, or MCP servers",
  ]) {
    assert.ok(html.includes(phrase), phrase);
  }
  // Stated once, in the closing section, rather than repeated in the hero and
  // under every example. Script payloads are excluded so the streamed RSC copy
  // of the markup is not counted twice.
  const markup = html.replace(/<script\b[\s\S]*?<\/script>/g, "");
  assert.equal(markup.split("Never edits the repository it checks.").length - 1, 1);
  assert.doesNotMatch(markup.slice(0, markup.indexOf("Matching files")), /Read-only|Deterministic/);
});

test("the walkthrough slot is reserved without fabricated player chrome", () => {
  assert.match(html, /Watch a full check/);
  assert.match(html, /Recording in progress/);
  // No invented running time, play control, or production credit.
  assert.doesNotMatch(html, /\d{1,2}:\d{2}/);
  assert.doesNotMatch(html, /Film \d|in production|demo-video-play/);
  assert.doesNotMatch(html, /<video\b/);
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
  assert.ok(links.length >= 3);
  for (const link of links) {
    assert.ok(ids.has(link), "Missing anchor " + link);
  }
});

test("navigation stays short and points outward", () => {
  const nav = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
  const links = [...nav.matchAll(/<a\b/g)].length;
  assert.ok(links <= 3, "header carries the word mark plus at most two links, got " + links);
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
  assert.match(html, /src="\/brand\/wordmark\.png"[^>]*alt="PlaybookDiff"/);
  assert.match(html, /src="\/brand\/claude_logo\.png"[^>]*alt=""/);
  assert.match(html, /src="\/brand\/codex_logo\.png"[^>]*alt=""/);
  assert.match(html, /rel="icon"[^>]*\/icon\.png/);
});

test("website dependencies remain standalone and minimal", () => {
  assert.deepEqual(Object.keys(packageJson.dependencies).sort(), ["next", "react", "react-dom"]);
  assert.equal(JSON.stringify(packageJson).includes("workspace:"), false);
});

test("typefaces are self-hosted and reachable", async () => {
  const css = await readFile(path.join(root, "app/globals.css"), "utf8");
  const faces = [...css.matchAll(/url\("(\/fonts\/[^"]+)"\)/g)].map((match) => match[1]);
  assert.ok(faces.length >= 4, "the page ships its own typefaces");
  const shipped = new Set(await readdir(path.join(root, "public/fonts")));
  for (const face of faces) {
    assert.ok(shipped.has(path.basename(face)), "missing font file " + face);
  }
  assert.doesNotMatch(css, /https?:\/\//);
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
          /\/Users\/|\/private\/tmp\/|process\.env|next\/font|@import\s+url|fonts\.(?:googleapis|gstatic)\.com/,
        );
      }
    }
  }
  for (const directory of ["app", "components", "lib"]) {
    await inspect(path.join(root, directory));
  }
});
