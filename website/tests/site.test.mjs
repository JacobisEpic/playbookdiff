import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const html = await readFile(path.join(root, ".next/server/app/index.html"), "utf8");
const examples = JSON.parse(await readFile(path.join(root, "lib/examples.json"), "utf8"));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

test("production homepage renders the product and primary CTA", () => {
  assert.match(html, /Same repo\./);
  assert.match(html, /Different agents\./);
  assert.match(html, /Know the difference\./);
  assert.match(html, /View on GitHub/);
  assert.match(html, /https:\/\/github.com\/JacobisEpic\/playbookdiff/);
});

test("all supported CLI commands and honest source-install status render", () => {
  for (const command of [
    "playbookdiff check .",
    "playbookdiff explain &lt;finding-id&gt; .",
    "playbookdiff diff main..HEAD",
  ]) {
    assert.ok(html.includes(command), command);
  }
  assert.match(html, /Public package installation is not assumed/);
  assert.match(html, /pnpm --filter playbookdiff build/);
  assert.match(
    html,
    /New medium\/high findings exit 1; existing debt does not\. Analysis errors exit 2\./,
  );
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
  assert.match(html, /Example analysis/);
  assert.match(html, /This browser does not analyze your repository/);
  assert.match(html, /Prefix shown; logical key and stable digest shortened/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /aria-pressed="false"/);
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
  for (const link of sourceLinks) assert.ok(link.includes("/" + examples.baseline + "/"), link);
  assert.ok(
    sourceLinks.some((link) =>
      link.endsWith(
        "/tree/" +
          examples.baseline +
          "/packages/harness-codex/test/fixtures/comparison/semantic-unknown",
      ),
    ),
  );
});

test("metadata is present without an invented origin", () => {
  for (const name of [
    "description",
    "og:title",
    "og:description",
    "twitter:title",
    "twitter:description",
  ]) {
    assert.ok(html.includes('="' + name + '"'), name);
  }
  assert.equal(html.includes('rel="canonical"'), false);
  assert.doesNotMatch(html, /(?:content|href)="https?:\/\/(?:localhost|127\.0\.0\.1)/);
});

test("semantic structure and limitations are present", () => {
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  assert.match(html, /<html lang="en"/);
  assert.match(html, /Skip to content/);
  for (const phrase of [
    "Unknown is better",
    "machine-effective",
    "runtime capabilities",
    "uncommitted edits",
    "zero findings",
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
