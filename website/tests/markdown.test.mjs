import assert from "node:assert/strict";
import { test } from "node:test";
import { renderMarkdown, slug } from "../lib/markdown.ts";

const render = (source, options) => renderMarkdown(source, options).html;

/**
 * The documentation these routes render is repository-owned, so this is a
 * defence-in-depth suite rather than a boundary against a hostile author. It
 * exists because the output goes through `dangerouslySetInnerHTML`: the
 * renderer has to be safe on its own, not because of what its callers happen
 * to pass it.
 */

test("raw HTML in a document is text, never markup", () => {
  const html = render("Raw <script>alert(1)</script> and <img src=x onerror=alert(1)>");
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script|<img/);
});

test("code spans and fences cannot close their own element", () => {
  for (const source of [
    "`</code><script>alert(1)</script>`",
    "```js\n</code></pre><script>alert(1)</script>\n```",
  ]) {
    const html = render(source);
    assert.doesNotMatch(html, /<script/);
    assert.equal(html.match(/<\/code>/g).length, 1);
  }
});

test("headings, tables, and link text escape their content", () => {
  assert.doesNotMatch(render("## <img src=x onerror=alert(1)>"), /<img/);
  assert.doesNotMatch(render("| a |\n| --- |\n| <script>x</script> |"), /<script/);
  assert.doesNotMatch(render("[<script>x</script>](https://example.com)"), /<script/);
});

test("a link target cannot break out of its attribute", () => {
  // A target containing whitespace is not a link at all, so it stays text.
  const spaced = render('[a](https://example.com" onmouseover="alert(1))');
  assert.doesNotMatch(spaced, /<a\b/);
  assert.doesNotMatch(spaced, /"[^<]*onmouseover/);

  // Without whitespace it is a link, and the quote is escaped so the injected
  // text stays inside the href rather than becoming a second attribute.
  const packed = render('[a](https://example.com"onmouseover="alert&#40;1&#41;)');
  const tag = /<a [^>]*>/.exec(packed)[0];
  const attributes = [...tag.matchAll(/ ([a-zA-Z-]+)="[^"]*"/g)].map((match) => match[1]);
  assert.deepEqual(attributes, ["href", "rel"], `no extra attribute: ${tag}`);
});

test("only http, https, mailto, and relative targets become links", () => {
  for (const scheme of [
    "javascript:alert`1`",
    "JaVaScRiPt:alert`1`",
    "vbscript:msgbox",
    "data:text/html;base64,PHNjcmlwdD48L3NjcmlwdD4=",
    "file:///etc/passwd",
  ]) {
    const html = render(`[click](${scheme})`);
    assert.equal(html, "<p>click</p>", scheme);
  }

  for (const safe of ["https://example.com", "http://example.com", "mailto:a@b.test"]) {
    assert.match(
      render(`[click](${safe})`),
      new RegExp(`href="${safe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`),
      safe,
    );
  }

  // Relative targets and fragments still work.
  assert.match(render("[a](./other.md)"), /href="\.\/other\.md"/);
  assert.match(render("[a](#anchor)"), /href="#anchor"/);
});

test("a resolveLink that returns a dangerous target is still refused", () => {
  // The renderer does not trust its caller to sanitise.
  const html = render("[a](./other.md)", { resolveLink: () => "javascript:alert(1)" });
  assert.equal(html, "<p>a</p>");
});

test("external links carry rel=noreferrer, internal ones do not", () => {
  assert.match(render("[a](https://example.com)"), /rel="noreferrer"/);
  assert.doesNotMatch(render("[a](/docs/cli)"), /rel="noreferrer"/);
});

test("heading slugs follow GitHub's rules", () => {
  assert.equal(slug("`--cwd` vs `--path`"), "--cwd-vs---path");
  assert.equal(
    slug("Isolation: your checkout is never touched"),
    "isolation-your-checkout-is-never-touched",
  );
  assert.equal(slug("What one run covers"), "what-one-run-covers");
});
