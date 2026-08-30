/**
 * Deterministic block-level decomposition of instruction text.
 *
 * The comparator needs to answer one narrow, mechanical question about two
 * instructions that are not byte-identical: *how much of one side's content
 * has no counterpart at all on the other side?* Answering it at whole-file
 * granularity is too coarse - a single unmatched sentence on one side would
 * otherwise stand in for an arbitrarily large body of unmatched instructions
 * on the other.
 *
 * A "content unit" is a Markdown block: a fenced code block (kept atomic,
 * including its blank lines), or a run of non-blank lines delimited by blank
 * lines. Units are compared by exact normalized text. Nothing here interprets
 * meaning, weighs importance, or measures length - two units correspond only
 * when their text is identical.
 */

const FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Splits instruction content into normalized block-level content units,
 * preserving fenced code blocks whole and dropping blank-only blocks.
 */
export function instructionContentUnits(content: string): string[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const units: string[] = [];
  let current: string[] = [];
  let fenceMarker: string | undefined;

  const flush = (): void => {
    const text = current.join("\n").trim();
    if (text.length > 0) units.push(text);
    current = [];
  };

  for (const line of lines) {
    if (fenceMarker === undefined) {
      const opening = FENCE_PATTERN.exec(line);
      if (opening?.[1]) {
        flush();
        fenceMarker = opening[1];
        current.push(line);
        continue;
      }
      if (line.trim().length === 0) {
        flush();
        continue;
      }
      current.push(line);
      continue;
    }

    current.push(line);
    const closing = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
    const marker = closing?.[1];
    if (marker && marker[0] === fenceMarker[0] && marker.length >= fenceMarker.length) {
      fenceMarker = undefined;
      flush();
    }
  }
  flush();
  return units;
}

/**
 * Counts the content units of `content` that do not appear anywhere in
 * `available`.
 *
 * Membership is set-based rather than multiset-based: a unit repeated on one
 * side is considered covered by a single occurrence on the other. That keeps
 * the count a conservative lower bound on genuinely one-sided content.
 */
export function uncoveredUnitCount(content: string, available: ReadonlySet<string>): number {
  return instructionContentUnits(content).filter((unit) => !available.has(unit)).length;
}

/** The set of every content unit appearing in any of `contents`. */
export function contentUnitSet(contents: readonly string[]): Set<string> {
  const units = new Set<string>();
  for (const content of contents) {
    for (const unit of instructionContentUnits(content)) units.add(unit);
  }
  return units;
}
