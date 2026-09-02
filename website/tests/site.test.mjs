import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const html = await readFile(path.join(root, ".next/server/app/index.html"), "utf8");
const examples = JSON.parse(await readFile(path.join(root, "lib/examples.json"), "utf8"));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

test("production homepage renders the product and primary CTAs", () => {
  assert.match(html, /Same repo\./);
  assert.match(html, /Different agents\./);
  assert.match(html, /Know the difference\./);
  assert.match(html, /See it on a real repo/);
  assert.match(html, /View on GitHub/);
  assert.match(html, /https:\/\/github.com\/JacobisEpic\/playbookdiff/);
});

test("both supported run surfaces render with honest distribution status", () => {
  for (const command of [
    "playbookdiff check .",
    "playbookdiff explain &lt;finding-id&gt; .",
    "playbookdiff diff origin/main..HEAD",
  ]) {
    assert.ok(html.includes(command), command);
  }
  assert.match(html, /The CLI is not published to npm yet/);
  assert.match(html, /pnpm build/);
  assert.match(html, /node packages\/cli\/dist\/bin\.js check \./);
  // The Action is released at the movable v0 tag and externally smoke-tested,
  // so the usable snippet must be on the page rather than described in prose.
  assert.ok(html.includes("uses: JacobisEpic/playbookdiff@v0"), "action reference");
  assert.match(html, /actions\/checkout@v4/);
  // npm distribution does not exist; nothing may imply that it does.
  assert.doesNotMatch(html, /npm (?:i |install )(?:-g )?playbookdiff|npx playbookdiff/);
});

test("no stale pre-launch or private-repository claim survives", () => {
  for (const stale of [
    /Public launch in progress/i,
    /until the repository opens/i,
    /release tags? (?:may remain limited|are still pending|is still pending)/i,
    /repository access may remain limited/i,
    /source access (?:is |may be |may remain )?limited/i,
    /pre-release/i,
    /not (?:yet )?public/i,
  ]) {
    assert.doesNotMatch(html, stale, String(stale));
  }
});

test("example data preserves the checked-in A/B assertions", () => {
  assert.equal(examples.baseline, "2cdda6b15f30b12d26d6dee0fa5462aa88a60b6f");
  // Pinned to what the current engine actually reports for this fixture. From the
  // repository root Codex never reaches the nested files; launching inside
  // apps/api brings them into its chain, and everything compares equivalent.
  assert.equal(examples.root.count, 2);
  assert.equal(examples.api.count, 0);
  assert.equal(examples.root.equivalent, 2);
  assert.equal(examples.api.equivalent, 4);
  assert.deepEqual(examples.root.codex.notReceived, ["apps/api/AGENTS.md", "api-skill"]);
  assert.deepEqual(examples.api.codex.notReceived, []);
  assert.deepEqual(
    examples.root.findings.map((f) => f.type),
    ["missing", "capability-gap"],
  );
  assert.deepEqual(
    examples.api.findings.map((f) => f.type),
    [],
  );
  for (const scenario of [examples.root, examples.api])
    assert.equal(scenario.count, scenario.findings.length);
});

test("demo is labeled as static fixture data, never a live analyzer", () => {
  assert.match(html, /Nothing here reads your repository/);
  assert.match(html, /the page ships the answers with it/);
  assert.match(html, /This fixture shows a shortened prefix/);
  assert.match(html, new RegExp("baseline " + examples.baseline.slice(0, 7)));
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /aria-pressed="false"/);
  // The prerendered state is the repository-root scenario.
  assert.match(html, /One agent is missing part of the playbook/);
  assert.ok(html.includes(examples.root.count + " findings"));
});

test("the cleared scenario ships in the client bundle, not only the default state", async () => {
  // The apps/api branch renders only after interaction, so it never appears in
  // the prerendered HTML. Assert it is in the shipped chunk instead of weakening
  // the claim that changing cwd alone clears the report.
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

test("GitHub Action value is shown with verified regression behavior", () => {
  assert.match(html, /Pre-existing debt and resolved findings never do/);
  assert.match(html, /1 existing \+ 1 new/);
  assert.match(html, /1 new actionable compatibility regression/);
  assert.match(html, /Released as/);
  assert.match(html, /v0\.1\.0/);
  assert.match(html, /contents: read/);
  // The Action's documented behaviour, not a vague CI claim.
  for (const phrase of [
    "introduced-actionable-count",
    "analyzed-target-count",
    "no-new-regressions",
    "Match findings by stable ID",
  ]) {
    assert.ok(html.includes(phrase), phrase);
  }
});

test("the repository tree states reachability for both agents", () => {
  const tree = examples.tree;
  assert.ok(tree.nodes.length >= 9);
  for (const node of tree.nodes) {
    assert.ok(html.includes(node.name), node.name);
  }
  // Exactly the two files Codex cannot reach from the repository root.
  assert.deepEqual(examples.root.unreached, ["apps/api/AGENTS.md", "api-skill-codex"]);
  assert.deepEqual(examples.api.unreached, []);
  for (const id of examples.root.unreached) {
    assert.ok(
      tree.nodes.some((node) => node.id === id),
      id,
    );
  }
  assert.match(html, /never reached/);
  assert.match(html, /Claude Code ends up with/);
  assert.match(html, /Codex ends up with/);
});

test("provenance contains only repo-relative evidence paths", () => {
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
  assert.ok(links.length > 5);
  for (const link of links) assert.ok(ids.has(link), "Missing anchor " + link);
  const sourceLinks = [
    ...html.matchAll(
      /href="(https:\/\/github\.com\/JacobisEpic\/playbookdiff\/(?:blob|tree)\/[^"]+)"/g,
    ),
  ].map((match) => match[1]);
  assert.ok(sourceLinks.length >= 6);
  const pinnedLinks = sourceLinks.filter((link) => link.includes("/" + examples.baseline + "/"));
  const currentLinks = sourceLinks.filter((link) => link.includes("/main/"));
  assert.ok(pinnedLinks.length >= 3);
  assert.ok(currentLinks.length >= 6);
  assert.ok(
    pinnedLinks.some((link) =>
      link.endsWith(
        "/tree/" +
          examples.baseline +
          "/packages/harness-codex/test/fixtures/comparison/semantic-unknown",
      ),
    ),
  );
});

test("metadata uses the verified production origin", () => {
  for (const name of [
    "description",
    "og:title",
    "og:description",
    "twitter:title",
    "twitter:description",
  ]) {
    assert.ok(html.includes('="' + name + '"'), name);
  }
  // Guards against regressing to `productionOrigin = undefined` or to a
  // deployment-specific preview host, either of which breaks canonical/OG.
  assert.ok(html.includes('<link rel="canonical" href="https://playbookdiff.vercel.app"'));
  assert.ok(html.includes('property="og:url" content="https://playbookdiff.vercel.app"'));
  assert.doesNotMatch(html, /(?:content|href)="https?:\/\/(?:localhost|127\.0\.0\.1)/);
  assert.doesNotMatch(
    html,
    /(?:content|href)="https:\/\/(?!playbookdiff\.vercel\.app)[^"]*\.vercel\.app/,
  );
});

test("compared surfaces are stated as a table, not as marketing claims", () => {
  assert.match(html, /Claude Code reads/);
  assert.match(html, /Codex reads/);
  for (const surface of [
    "CLAUDE.md, .claude/rules/",
    "AGENTS.md",
    ".claude/skills/",
    ".agents/skills/",
    ".mcp.json",
    ".codex/config.toml",
  ]) {
    assert.ok(html.includes(surface), surface);
  }
});

test("semantic structure and limitations are present", () => {
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  assert.match(html, /<html lang="en"/);
  assert.match(html, /Skip to content/);
  for (const phrase of [
    "Unknown beats guessed",
    "Compile",
    "No model calls",
    "machine-effective",
    "runtime capabilities",
    "working-tree Git diffing",
    "semantic relationship unknown",
  ]) {
    assert.ok(html.includes(phrase), phrase);
  }
});

test("website dependencies are standalone and minimal", () => {
  assert.deepEqual(Object.keys(packageJson.dependencies).sort(), ["next", "react", "react-dom"]);
  assert.equal(JSON.stringify(packageJson).includes("workspace:"), false);
});

test("source has no host paths, external fonts, required env, or model calls", async () => {
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await inspect(filename);
      else {
        const content = await readFile(filename, "utf8");
        assert.doesNotMatch(
          content,
          /\/Users\/|\/private\/tmp\/|process\.env|next\/font|@import\s+url/,
        );
      }
    }
  }
  for (const directory of ["app", "components", "lib"]) await inspect(path.join(root, directory));
});
