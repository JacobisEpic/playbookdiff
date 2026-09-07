import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

const html = await read(".next/server/app/index.html");
const example = JSON.parse(await read("lib/effective-scope.json"));
const packageJson = JSON.parse(await read("package.json"));
const css = await read("app/globals.css");

// Script payloads carry a streamed copy of the markup, so anything counting
// occurrences has to look at the rendered document alone.
const markup = html.replace(/<script\b[\s\S]*?<\/script>/g, "");

test("the homepage states the product job and its primary actions immediately", () => {
  assert.match(html, /Keep Claude Code and/);
  assert.match(html, /Codex/);
  assert.match(html, /in sync./);
  assert.match(
    html,
    /PlaybookDiff checks the instructions, skills, and MCP configuration each coding agent effectively receives, and catches differences before they land/,
  );
  assert.ok(html.includes("https://github.com/JacobisEpic/playbookdiff"));
});

test("npm is the primary local path, with the real package and command", () => {
  // The published binary and package name are the same word, so `npx` works.
  assert.ok(html.includes("npm install -g playbookdiff"), "install command");
  assert.ok(html.includes("playbookdiff check ."), "first run");
  // No pre-publication hedging survives anywhere on the page.
  assert.doesNotMatch(html, /not on npm|coming soon|once npm|build from source for now/i);
  // The install command comes before the Action, which comes before the
  // repository: npm is the default, CI is next, source is the fallback.
  const install = html.indexOf("npm install -g playbookdiff");
  const action = html.indexOf("uses: JacobisEpic/playbookdiff@v0");
  const source = html.indexOf("Prefer to build from source");
  assert.ok(install >= 0 && action > install && source > action, "npm, then Action, then source");
});

test("the GitHub Action is shown with the checkout depth it actually needs", () => {
  assert.ok(html.includes("uses: JacobisEpic/playbookdiff@v0"), "Action reference");
  assert.ok(html.includes("fetch-depth: 0"), "diff never fetches, so history must be present");
  assert.match(html, /v0\.2\.0/);
  assert.match(html, /existing debt stays green/);
});

test("the homepage names every compared surface", () => {
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
});

test("the interactive example is generated from real analyzer output", () => {
  assert.equal(example.generatedBy, "scripts/generate-website-example.mjs");
  assert.equal(example.fixture, "packages/harness-codex/test/fixtures/cross-harness/cwd-target");
  assert.equal(example.test, "packages/harness-codex/src/cross-harness.test.ts");
  assert.equal(example.target, "apps/api/file.ts");

  // The two runs differ in exactly one input, the launch directory.
  assert.equal(example.scenarios.root.cwd, ".");
  assert.equal(example.scenarios.api.cwd, "apps/api");
  assert.equal(example.scenarios.root.actionable, 2);
  assert.equal(example.scenarios.api.actionable, 0);
  assert.equal(example.scenarios.root.equivalent, 2);
  assert.equal(example.scenarios.api.equivalent, 4);
  assert.deepEqual(
    example.scenarios.root.findings.map((finding) => finding.type),
    ["missing", "capability-gap"],
  );
  assert.deepEqual(example.scenarios.api.findings, []);

  // The point of the example: from the repository root the two nested Codex
  // files are never received, and moving the launch directory fixes only that.
  const absent = example.rows.filter((row) => row.states.root === "absent");
  assert.deepEqual(
    absent.map((row) => row.path),
    ["apps/api/AGENTS.md", "apps/api/.agents/skills/api-skill/"],
  );
  assert.ok(
    absent.every((row) => row.harness === "codex" && row.states.api === "startup"),
    "only Codex misses them, and only from the repository root",
  );
  // Claude Code reaches its nested pair, later rather than never.
  assert.deepEqual(
    example.rows.filter((row) => row.states.root === "on-demand").map((row) => row.harness),
    ["claude", "claude"],
  );
  // Every file in the fixture is drawn, both harnesses' sides included.
  assert.equal(example.rows.length, 8);
  assert.equal(example.rows.filter((row) => row.harness === "claude").length, 4);
});

test("the example renders, is interactive, and carries the real transcript", () => {
  assert.match(html, /Both agents were launched from/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /aria-pressed="false"/);
  assert.ok(html.includes(example.target), "the work target both runs share");
  for (const row of example.rows) {
    assert.ok(html.includes(row.name), row.path);
  }
  for (const finding of example.scenarios.root.findings) {
    assert.ok(html.includes(finding.explanation), finding.id);
    for (const evidence of finding.evidence) assert.ok(html.includes(evidence), evidence);
  }
  // The verbatim terminal output is available without leaving the page.
  assert.ok(html.includes("Result: compatibility issues found"), "real transcript");
});

test("the cleared scenario ships in the client bundle", async () => {
  const chunks = path.join(root, ".next/static/chunks");
  const sources = await Promise.all(
    (await readdir(chunks, { recursive: true }))
      .filter((entry) => entry.endsWith(".js"))
      .map((entry) => readFile(path.join(chunks, entry), "utf8")),
  );
  for (const phrase of ["No findings.", example.scenarios.api.transcript.split("\n")[0]]) {
    assert.ok(
      sources.some((source) => source.includes(phrase)),
      phrase,
    );
  }
});

test("the example points at the fixture, the test, and both harness specifications", () => {
  // The commit comes from the generated file, which is only written after the
  // generator proves every cited file is byte-identical at it.
  assert.match(example.baseline, /^[0-9a-f]{40}$/);
  assert.ok(html.includes(`/blob/${example.baseline}/${example.test}`), "the test, pinned");
  assert.ok(html.includes(`/tree/${example.baseline}/${example.fixture}`), "the fixture, pinned");
  assert.ok(html.includes('href="/docs/harnesses/claude"'));
  assert.ok(html.includes('href="/docs/harnesses/codex"'));
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
  assert.equal(markup.split("Never edits the repository it checks.").length - 1, 1);
  // Every guarantee links to the document that says how it is enforced.
  assert.ok(html.includes('href="/docs/security"'));
});

test("the FAQ answers the misconceptions that would otherwise stop adoption", () => {
  for (const question of [
    "Why can&#x27;t I just keep CLAUDE.md and AGENTS.md identical?",
    "Does PlaybookDiff run Claude Code or Codex?",
    "Does it send my repository anywhere?",
    "If the configuration matches, will the two agents behave the same?",
    "What happens when it is not sure?",
    "Will differences we already have break CI?",
    "Which agents are supported?",
  ]) {
    assert.ok(html.includes(question), question);
  }
  // Native disclosure, so it works without JavaScript and from the keyboard.
  assert.ok(html.includes("<details"), "the FAQ is a native disclosure");
  assert.doesNotMatch(html, /role="tablist"|role="tab"/);
});

test("the site never claims more than PlaybookDiff proves", () => {
  assert.doesNotMatch(markup, /what Claude sees|what Codex sees/i);
  assert.doesNotMatch(markup, /AI-powered|revolutionary|game-changing|supercharge|seamless/i);
  // It compares configuration, and says so rather than promising equal behaviour.
  assert.doesNotMatch(markup, /guarantees? (?:that )?(?:both )?agents behave/i);
});

test("nothing unfinished is published", () => {
  assert.doesNotMatch(html, /Recording in progress|Coming soon|in progress|Watch a full check/i);
  assert.doesNotMatch(html, /<video\b|walkthrough/i);
  assert.doesNotMatch(html, /\d{1,2}:\d{2}/);
});

test("colour is reserved for findings, never for agent branding", () => {
  assert.doesNotMatch(css, /--claude\b|--codex\b|mark-codex/);
  assert.doesNotMatch(html, /mark-codex/);
  const hues = [...css.matchAll(/^\s*(--signal[\w-]*):/gm)].map((match) => match[1]).sort();
  assert.deepEqual(hues, ["--signal-leader", "--signal-on-dark"]);
  // The one coloured state in the tree is the one that is a finding.
  assert.match(css, /\.scope-row\[data-state="absent"\][\s\S]*?--signal-leader/);
});

test("local anchor links point at existing IDs", () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const links = [...html.matchAll(/\bhref="#([^"]+)"/g)].map((match) => match[1]);
  assert.ok(links.length >= 1);
  for (const link of links) {
    assert.ok(ids.has(link), "Missing anchor " + link);
  }
});

test("navigation stays short and points at first-party docs", () => {
  const nav = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
  const links = [...nav.matchAll(/<a\b/g)].length;
  assert.ok(links <= 3, "the word mark plus at most two links, got " + links);
  assert.ok(nav.includes('href="/docs"'), "Docs is a first-party route");
  assert.doesNotMatch(nav, /blob\/main\/docs/);
});

test("metadata uses the canonical production origin", () => {
  for (const name of [
    "description",
    "og:title",
    "og:description",
    "og:image",
    "twitter:title",
    "twitter:description",
    "twitter:image",
  ]) {
    assert.ok(html.includes('="' + name + '"'), name);
  }
  assert.match(html, /<title>PlaybookDiff<\/title>/);
  assert.ok(html.includes('<link rel="canonical" href="https://playbookdiff.dev"'));
  assert.ok(html.includes('property="og:url" content="https://playbookdiff.dev"'));
  assert.match(html, /property="og:image" content="https:\/\/playbookdiff\.dev\//);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.doesNotMatch(html, /(?:content|href)="https?:\/\/(?:localhost|127\.0\.0\.1)/);
});

test("no rendered route still points at the old deployment alias", async () => {
  for (const file of await renderedRoutes()) {
    const page = await readFile(file, "utf8");
    assert.doesNotMatch(page, /playbookdiff\.vercel\.app/, file);
  }
  const sitemap = await read(".next/server/app/sitemap.xml.body");
  assert.match(sitemap, /<loc>https:\/\/playbookdiff\.dev\/<\/loc>/);
  assert.doesNotMatch(sitemap, /vercel\.app/);
});

async function renderedRoutes() {
  const app = path.join(root, ".next/server/app");
  const entries = await readdir(app, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

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
      } else if (!entry.name.endsWith(".png")) {
        const content = await readFile(filename, "utf8");
        assert.doesNotMatch(
          content,
          /\/Users\/|\/private\/tmp\/|next\/font|@import\s+url|fonts\.(?:googleapis|gstatic)\.com/,
          filename,
        );
      }
    }
  }
  for (const directory of ["app", "components", "lib"]) {
    await inspect(path.join(root, directory));
  }
});

test("every state label is the analyzer's own vocabulary, not a paraphrase of it", () => {
  // "on demand" may only stand for a state that genuinely means "reached later,
  // on the way to the work target": an `on-demand` instruction load phase, or
  // Claude Code's `conditional` skill discovery. It must never stand for
  // `unavailable` or `unknown`, which mean something else entirely.
  const allowed = {
    startup: ["startup", "available"],
    "on-demand": ["on-demand", "conditional"],
    absent: ["absent"],
  };
  const seen = new Set();
  for (const row of example.rows) {
    for (const scenario of Object.keys(example.scenarios)) {
      const label = row.states[scenario];
      const analyzer = row.analyzerStates[scenario];
      assert.ok(allowed[label], `unknown label ${label} on ${row.path}`);
      assert.ok(
        allowed[label].includes(analyzer),
        `${row.path} labels analyzer state ${analyzer} as ${label}`,
      );
      seen.add(analyzer);
    }
  }
  // The example is expected to exercise `conditional`; if it stops doing so the
  // label needs re-justifying rather than silently going unused.
  assert.ok(seen.has("conditional"), "the example still demonstrates conditional discovery");
  assert.ok(!seen.has("unavailable") && !seen.has("unknown"), "no unmapped analyzer state");
});

test("the GitHub Action snippet is valid, copy-pasteable YAML", () => {
  // Two sequence items; `with` is a sibling of `uses`, indented two spaces from
  // the dash. One space too many makes it a nested mapping and the workflow
  // fails to parse, so the exact text is pinned here.
  const expected = [
    "- uses: actions/checkout@v4",
    "  with:",
    "    fetch-depth: 0",
    "",
    "- uses: JacobisEpic/playbookdiff@v0",
  ].join("\n");
  const block = /aria-label="Use PlaybookDiff in GitHub Actions"><code>([\s\S]*?)<\/code>/.exec(
    html,
  );
  assert.ok(block, "the Action snippet is rendered");
  const snippet = block[1]
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  assert.equal(snippet, expected);
});
