/**
 * A small Markdown renderer for the repository's own documentation.
 *
 * The docs under `docs/` are the source of truth and are mirrored into
 * `content/docs/` by `pnpm website:sync`, so this only has to handle the
 * constructs those files actually use: ATX headings, paragraphs, fenced code,
 * bullet and ordered lists, blockquotes, GitHub tables, and inline code,
 * emphasis, and links.
 *
 * It runs at build time and ships nothing to the browser, which is why the
 * site can render first-party docs without taking on a documentation
 * framework or a runtime Markdown dependency.
 */

export type Heading = { depth: number; id: string; text: string };

export type RenderedMarkdown = {
  /** The document's `#` heading, used as the page title. */
  title: string;
  html: string;
  /** `##` headings, for the on-page contents list. */
  headings: Heading[];
};

type Options = {
  /** Maps a Markdown link target onto the URL the website should use. */
  resolveLink?: (href: string) => string;
};

const escapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (character) => escapes[character]);

/** GitHub's heading slug rules, so existing `#anchor` links keep resolving. */
export function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/ /g, "-");
}

function inline(source: string, options: Options): string {
  let html = "";
  let index = 0;

  while (index < source.length) {
    const rest = source.slice(index);

    // Code spans win over every other inline rule, so `**` inside a path or a
    // glob is never read as emphasis.
    const code = /^(`+)([\s\S]*?)\1(?!`)/.exec(rest);
    if (code) {
      html += `<code>${escapeHtml(code[2].trim())}</code>`;
      index += code[0].length;
      continue;
    }

    const link = /^\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest);
    if (link) {
      const href = options.resolveLink?.(link[2]) ?? link[2];
      const external = /^https?:\/\//.test(href);
      const attributes = external ? ' rel="noreferrer"' : "";
      html += `<a href="${escapeHtml(href)}"${attributes}>${inline(link[1], options)}</a>`;
      index += link[0].length;
      continue;
    }

    const autolink = /^<(https?:\/\/[^>]+)>/.exec(rest);
    if (autolink) {
      html += `<a href="${escapeHtml(autolink[1])}" rel="noreferrer">${escapeHtml(autolink[1])}</a>`;
      index += autolink[0].length;
      continue;
    }

    const strong = /^\*\*([\s\S]+?)\*\*/.exec(rest);
    if (strong) {
      html += `<strong>${inline(strong[1], options)}</strong>`;
      index += strong[0].length;
      continue;
    }

    const emphasis = /^_([^_]+)_/.exec(rest);
    if (emphasis) {
      html += `<em>${inline(emphasis[1], options)}</em>`;
      index += emphasis[0].length;
      continue;
    }

    html += escapeHtml(source[index]);
    index += 1;
  }

  return html;
}

const cell = (value: string) => value.trim();

function table(lines: string[], options: Options) {
  const row = (line: string) =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map(cell);

  const header = row(lines[0]);
  const body = lines.slice(2).map(row);

  const head = header.map((value) => `<th scope="col">${inline(value, options)}</th>`).join("");
  const rows = body
    .map(
      (values) =>
        `<tr>${values.map((value) => `<td>${inline(value, options)}</td>`).join("")}</tr>`,
    )
    .join("");

  // Wide reference tables scroll inside their own surface rather than widening
  // the page, and stay reachable from the keyboard while they do.
  return `<div class="doc-table" tabindex="0" role="region" aria-label="Table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function renderMarkdown(source: string, options: Options = {}): RenderedMarkdown {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const headings: Heading[] = [];
  const blocks: string[] = [];
  let title = "";
  let index = 0;

  const paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length === 0) return;
    blocks.push(`<p>${inline(paragraph.join(" "), options)}</p>`);
    paragraph.length = 0;
  };

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === "") {
      flush();
      index += 1;
      continue;
    }

    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      flush();
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      const language = fence[1] ? ` data-language="${escapeHtml(fence[1])}"` : "";
      blocks.push(
        `<pre tabindex="0"${language}><code>${escapeHtml(body.join("\n"))}\n</code></pre>`,
      );
      continue;
    }

    const heading = /^(#{1,6}) (.*)$/.exec(line);
    if (heading) {
      flush();
      const depth = heading[1].length;
      const text = heading[2].trim();
      index += 1;
      if (depth === 1) {
        title = text.replace(/`/g, "");
        continue;
      }
      const id = slug(text);
      if (depth === 2) headings.push({ depth, id, text: text.replace(/`/g, "") });
      blocks.push(
        `<h${depth} id="${escapeHtml(id)}">` +
          `<a class="doc-anchor" href="#${escapeHtml(id)}">${inline(text, options)}</a>` +
          `</h${depth}>`,
      );
      continue;
    }

    if (line.startsWith("|")) {
      flush();
      const rows: string[] = [];
      while (index < lines.length && lines[index].startsWith("|")) {
        rows.push(lines[index]);
        index += 1;
      }
      blocks.push(table(rows, options));
      continue;
    }

    if (line.startsWith("> ")) {
      flush();
      const quoted: string[] = [];
      while (index < lines.length && lines[index].startsWith(">")) {
        quoted.push(lines[index].replace(/^> ?/, ""));
        index += 1;
      }
      blocks.push(`<blockquote><p>${inline(quoted.join(" "), options)}</p></blockquote>`);
      continue;
    }

    const bullet = /^[-*] (.*)$/.exec(line);
    const ordered = /^\d+\. (.*)$/.exec(line);
    if (bullet || ordered) {
      flush();
      const tag = bullet ? "ul" : "ol";
      const pattern = bullet ? /^[-*] (.*)$/ : /^\d+\. (.*)$/;
      const items: string[] = [];
      while (index < lines.length) {
        const match = pattern.exec(lines[index]);
        if (match) {
          items.push(match[1]);
          index += 1;
          continue;
        }
        // A wrapped continuation line is indented and belongs to the item above.
        if (/^\s+\S/.test(lines[index]) && items.length > 0) {
          items[items.length - 1] += ` ${lines[index].trim()}`;
          index += 1;
          continue;
        }
        break;
      }
      const rendered = items.map((item) => `<li>${inline(item, options)}</li>`).join("");
      blocks.push(`<${tag}>${rendered}</${tag}>`);
      continue;
    }

    paragraph.push(line.trim());
    index += 1;
  }

  flush();

  return { title, html: blocks.join("\n"), headings };
}
