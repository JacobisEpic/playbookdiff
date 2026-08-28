import path from "node:path";
import picomatch from "picomatch";
import type { Diagnostic } from "@playbookdiff/core/types";
import { createDiagnostic, type IdRegistry } from "./diagnostics.js";
import { readFileIfExists } from "./paths.js";

export type ExcludeMatcher = {
  matches: (absolutePath: string) => boolean;
  diagnostics: Diagnostic[];
};

/**
 * Reads `claudeMdExcludes` from `<cwd>/.claude/settings.json` only - current
 * documentation states project settings are loaded from `<cwd>/.claude/`
 * without ancestor fallback, unlike CLAUDE.md/rules discovery.
 */
export async function loadClaudeMdExcludes(
  cwd: string,
  registry: IdRegistry,
): Promise<ExcludeMatcher> {
  const settingsPath = path.join(cwd, ".claude", "settings.json");
  const raw = await readFileIfExists(settingsPath);
  if (raw === undefined) {
    return { matches: () => false, diagnostics: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      matches: () => false,
      diagnostics: [
        createDiagnostic(registry, {
          level: "warning",
          code: "parse-error",
          slug: "settings-json",
          message:
            "<cwd>/.claude/settings.json is not valid JSON; claudeMdExcludes could not be read.",
        }),
      ],
    };
  }

  const patterns = extractPatterns(parsed);
  if (patterns.length === 0) {
    return { matches: () => false, diagnostics: [] };
  }

  const matchers = patterns.map((pattern) => picomatch(pattern, { dot: true, windows: false }));
  return {
    matches: (absolutePath: string): boolean => {
      const posixPath = absolutePath.split(path.sep).join("/");
      return matchers.some((isMatch) => {
        try {
          return isMatch(posixPath);
        } catch {
          // Documented behavior for an invalid pattern (e.g. an unescaped "["
          // that isn't a valid bracket expression) is that it matches nothing
          // rather than erroring, without breaking the settings file's other
          // patterns.
          return false;
        }
      });
    },
    diagnostics: [],
  };
}

function extractPatterns(parsed: unknown): string[] {
  if (typeof parsed !== "object" || parsed === null) {
    return [];
  }
  const value = (parsed as Record<string, unknown>).claudeMdExcludes;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}
