import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const repository = path.resolve(root, "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const rendered = (route) => readFile(path.join(root, ".next/server/app", `${route}.html`), "utf8");

// The routes the site publishes, and the Markdown each one renders.
const routes = [
  ["docs/cli", "docs/cli.md", "CLI"],
  ["docs/action", "docs/github-action.md", "GitHub Action"],
  ["docs/git-diff", "docs/git-diff.md", "Git regression diffing"],
  ["docs/limitations", "docs/limitations.md", "Scope and limitations"],
  ["docs/security", "docs/security.md", "Security model"],
  ["docs/comparison", "docs/comparison.md", "Comparison"],
  ["docs/architecture", "docs/architecture.md", "Architecture"],
  ["docs/validation", "docs/validation.md", "Validation"],
  ["docs/harnesses/claude", "docs/harnesses/claude.md", "Claude Code harness specification"],
  ["docs/harnesses/codex", "docs/harnesses/codex.md", "Codex harness specification"],
];

test("the repository's documentation is the source of truth, and the mirror matches it", async () => {
  const source = path.join(repository, "docs");
  const mirror = path.join(root, "content/docs");
  const entries = await readdir(source, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.relative(source, path.join(entry.parentPath, entry.name)));

  assert.ok(files.length > 0, "docs/ has Markdown to mirror");
  for (const file of files) {
    const original = await readFile(path.join(source, file), "utf8");
    const copy = await readFile(path.join(mirror, file), "utf8").catch(() => null);
    assert.equal(copy, original, `${file} is stale; run \`pnpm website:sync\``);
  }
});

test("every documentation route renders its document", async () => {
  for (const [route, , heading] of routes) {
    const html = await rendered(route);
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `${route} has one h1`);
    assert.ok(html.includes(heading), `${route} renders ${heading}`);
    assert.match(html, /<html lang="en"/);
  }
});

test("every documentation page links back to its own source file", async () => {
  for (const [route, source] of routes) {
    const html = await rendered(route);
    assert.ok(
      html.includes(`https://github.com/JacobisEpic/playbookdiff/blob/main/${source}`),
      `${route} links to ${source}`,
    );
    assert.ok(html.includes("View source on GitHub"), route);
  }
});

test("Markdown links to documents with a route become internal links", async () => {
  const cli = await rendered("docs/cli");
  // `docs/cli.md` links to `git-diff.md`, which has a first-party route.
  assert.ok(cli.includes('href="/docs/git-diff"'), "sibling document");
  assert.doesNotMatch(cli, /href="[^"]*blob\/main\/docs\/git-diff\.md"/);

  const action = await rendered("docs/action");
  assert.ok(action.includes('href="/docs/cli#--cwd-vs---path"'), "anchor is preserved");

  const claude = await rendered("docs/harnesses/claude");
  // A parent-relative link resolves the same way.
  assert.ok(
    claude.includes('href="/docs/comparison#canonical-scope-coordinate-system"'),
    "../comparison.md#anchor",
  );
});

test("Markdown links to files without a route still point at GitHub", async () => {
  const security = await rendered("docs/security");
  // SECURITY.md is a repository policy file, and belongs on GitHub.
  assert.ok(
    security.includes("https://github.com/JacobisEpic/playbookdiff/blob/main/SECURITY.md"),
    "repository policy file",
  );
  const validation = await rendered("docs/validation");
  assert.ok(
    validation.includes("https://github.com/JacobisEpic/playbookdiff/blob/main/CONTRIBUTING.md"),
  );
});

test("heading anchors keep GitHub's slugs, so existing links still resolve", async () => {
  const cli = await rendered("docs/cli");
  for (const id of ["--cwd-vs---path", "exit-codes", "install"]) {
    assert.ok(cli.includes(`id="${id}"`), id);
  }
  const gitDiff = await rendered("docs/git-diff");
  assert.ok(gitDiff.includes('id="isolation-your-checkout-is-never-touched"'));
});

test("every internal link on a documentation page resolves to a built route", async () => {
  const built = new Set(["/", "/docs", "/privacy"]);
  for (const [route] of routes) built.add(`/${route}`);

  for (const [route] of [...routes, ["docs"]]) {
    const html = await rendered(route);
    const links = [...html.matchAll(/href="(\/[^"#]*)(?:#[^"]*)?"/g)].map((match) => match[1]);
    for (const link of links) {
      if (link.startsWith("/brand/") || link.startsWith("/_next/") || link.startsWith("/fonts/")) {
        continue;
      }
      if (link.startsWith("/icon.png") || link.startsWith("/opengraph-image")) continue;
      assert.ok(built.has(link.replace(/\/$/, "") || "/"), `${route} links to unbuilt ${link}`);
    }
  }
});

test("documentation pages are rendered Markdown, not a second hand-written copy", async () => {
  // Every paragraph on the page comes from the mirrored Markdown, so the only
  // way to change the prose is to change the document in `docs/`.
  const markdown = await readFile(path.join(root, "content/docs/security.md"), "utf8");
  const html = await rendered("docs/security");
  const sentence = "Analysis never writes to the repository it analyzes.";
  assert.ok(markdown.includes(sentence));
  assert.ok(html.includes(sentence));
});

test("tables and code blocks stay scrollable rather than widening the page", async () => {
  const limitations = await rendered("docs/limitations");
  assert.match(limitations, /class="doc-table" tabindex="0" role="region"/);
  const cli = await rendered("docs/cli");
  assert.match(cli, /<pre tabindex="0" data-language="sh">/);
});

test("the documentation index lists every route it publishes", async () => {
  const html = await rendered("docs");
  for (const [route] of routes) {
    assert.ok(html.includes(`href="/${route}"`), route);
  }
  // Each page states its own canonical and og:url, not the homepage's.
  for (const [route] of routes) {
    const page = await rendered(route);
    assert.ok(page.includes(`href="https://playbookdiff.dev/${route}"`), `${route} canonical`);
    assert.ok(page.includes(`content="https://playbookdiff.dev/${route}"`), `${route} og:url`);
  }
  // npm is the install path the index leads with.
  assert.ok(html.includes("npm install -g playbookdiff"));
  assert.match(html, /npx\s*(?:<[^>]*>)*\s*playbookdiff/, "an npx path, for trying it once");
});

test("no document renders with unhandled Markdown left in the text", async () => {
  for (const [route] of routes) {
    const html = await rendered(route);
    // Code spans legitimately contain Markdown-looking characters (`**` in a
    // glob, `|` in a shell pipeline), so only the prose is checked.
    const body = html
      .slice(html.indexOf('class="doc-body"'), html.indexOf("</article>"))
      .replace(/<code>[\s\S]*?<\/code>/g, "")
      .replace(/<pre[\s\S]*?<\/pre>/g, "");
    // Anything the renderer did not understand would survive as literal syntax.
    assert.doesNotMatch(body, /\*\*/, `${route} has an unrendered bold marker`);
    assert.doesNotMatch(body, /\]\(/, `${route} has an unrendered link`);
    assert.doesNotMatch(body, /^\s*\|/m, `${route} has an unrendered table row`);
    assert.doesNotMatch(
      body,
      /&lt;\/?(?:p|ul|li|h[1-6]|table|code)&gt;/,
      `${route} escaped its own markup`,
    );
  }
});

test("code fences and inline code are escaped, not interpreted", async () => {
  const cli = await rendered("docs/cli");
  // `<finding-id>` in a fence must reach the reader as text.
  assert.ok(cli.includes("&lt;finding-id&gt;"), "angle brackets survive as text");
});

test("every GitHub link points at a path that exists in the repository", async () => {
  const { access } = await import("node:fs/promises");
  const pages = [".next/server/app/index.html", ".next/server/app/docs.html"];
  for (const [route] of routes) pages.push(`.next/server/app/${route}.html`);

  const seen = new Set();
  for (const page of pages) {
    const html = await read(page);
    for (const match of html.matchAll(
      /https:\/\/github\.com\/JacobisEpic\/playbookdiff\/(?:blob|tree)\/[0-9a-f]{40}|main\/([^"'\\ )]+)/g,
    )) {
      if (match[1]) seen.add(decodeURIComponent(match[1].replace(/#.*$/, "")));
    }
  }

  assert.ok(seen.size >= 5, `expected repository links, found ${seen.size}`);
  for (const target of seen) {
    await access(path.join(repository, target));
  }
});

test("every mirrored document is tracked by git, not just present on disk", async () => {
  // A file that exists locally but is ignored builds fine on the machine that
  // wrote it and 404s everywhere else. `website/.gitignore` carries two
  // generated agent files, and an unanchored `CLAUDE.md` pattern matches at any
  // depth - on a case-insensitive filesystem it also swallows
  // `content/docs/harnesses/claude.md`. This is the check that catches it
  // before CI or a deployment does.
  const { execFileSync } = await import("node:child_process");
  const tracked = new Set(
    execFileSync("git", ["ls-files", "content/docs"], { cwd: root, encoding: "utf8" })
      .split("\n")
      .filter(Boolean),
  );

  for (const [, source] of routes) {
    const mirrored = source.replace(/^docs\//, "content/docs/");
    assert.ok(tracked.has(mirrored), `${mirrored} is not tracked; check website/.gitignore`);
  }
});
