import { promises as fs } from "node:fs";
import path from "node:path";

export class AnalysisContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisContextError";
  }
}

export type ValidatedContext = {
  repositoryRoot: string;
  cwd: string;
  targetPath?: string;
  mode: "repo" | "local";
};

async function realDirectory(label: string, candidate: string): Promise<string> {
  let real: string;
  try {
    real = await fs.realpath(candidate);
  } catch {
    throw new AnalysisContextError(`${label} does not exist: ${candidate}`);
  }
  const stat = await fs.stat(real);
  if (!stat.isDirectory()) {
    throw new AnalysisContextError(`${label} is not a directory: ${candidate}`);
  }
  return real;
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/**
 * Resolves symlinks for the nearest existing ancestor of `candidate` and
 * re-appends any trailing path segments that don't exist yet, so a
 * not-yet-created `targetPath` still gets real containment checking through
 * whatever directories do exist, without requiring the leaf itself to exist.
 */
async function realpathAllowingMissingTail(candidate: string): Promise<string> {
  try {
    return await fs.realpath(candidate);
  } catch {
    const parent = path.dirname(candidate);
    if (parent === candidate) {
      return candidate;
    }
    const realParent = await realpathAllowingMissingTail(parent);
    return path.join(realParent, path.basename(candidate));
  }
}

/**
 * Resolves repositoryRoot/cwd/targetPath to real (symlink-resolved) absolute
 * paths and rejects a context that violates the repo-containment contract.
 * These are caller contract violations, not harness-discovery uncertainty,
 * so they throw rather than produce a Diagnostic.
 */
export async function validateAnalysisContext(context: {
  repositoryRoot: string;
  cwd: string;
  targetPath?: string;
  mode: "repo" | "local";
}): Promise<ValidatedContext> {
  const repositoryRoot = await realDirectory("repositoryRoot", context.repositoryRoot);
  const cwdCandidate = path.resolve(repositoryRoot, context.cwd);
  const cwd = await realDirectory("cwd", cwdCandidate);
  if (!isWithin(repositoryRoot, cwd)) {
    throw new AnalysisContextError(
      `cwd (${cwd}) does not resolve inside repositoryRoot (${repositoryRoot})`,
    );
  }

  if (context.targetPath === undefined) {
    return { repositoryRoot, cwd, mode: context.mode };
  }

  const targetCandidate = path.resolve(repositoryRoot, context.targetPath);
  const targetReal = await realpathAllowingMissingTail(targetCandidate);
  if (!isWithin(repositoryRoot, targetReal)) {
    throw new AnalysisContextError(
      `targetPath (${targetReal}) does not resolve inside repositoryRoot (${repositoryRoot})`,
    );
  }
  return { repositoryRoot, cwd, targetPath: targetReal, mode: context.mode };
}

/** Converts an absolute path known to be inside `root` to a repo-relative POSIX path; `root` itself becomes ".". */
export function toRepoRelativePosix(root: string, absolutePath: string): string {
  const relative = path.relative(root, absolutePath);
  if (relative === "") {
    return ".";
  }
  return relative.split(path.sep).join("/");
}

/**
 * Resolves `candidate` (relative to `fromDir`) and returns its real absolute
 * path plus whether it stays inside `root` — following symlinks, so an escape
 * via a symlink is caught the same way as a plain `../` escape.
 */
export async function resolveCandidate(
  root: string,
  fromDir: string,
  candidate: string,
): Promise<{ absolutePath: string; insideRoot: boolean; exists: boolean }> {
  const resolved = path.isAbsolute(candidate) ? candidate : path.resolve(fromDir, candidate);
  let real: string;
  try {
    real = await fs.realpath(resolved);
  } catch {
    return { absolutePath: resolved, insideRoot: isWithin(root, resolved), exists: false };
  }
  return { absolutePath: real, insideRoot: isWithin(root, real), exists: true };
}

/** Directories from `root` to `cwd` inclusive, root-to-cwd order. */
export function getAncestorChain(root: string, cwd: string): string[] {
  const relative = path.relative(root, cwd);
  if (relative === "") {
    return [root];
  }
  const segments = relative.split(path.sep);
  const chain: string[] = [root];
  let current = root;
  for (const segment of segments) {
    current = path.join(current, segment);
    chain.push(current);
  }
  return chain;
}

/** Directories strictly between `cwd` and `targetDir`, then `targetDir` itself; empty if `targetDir` is `cwd` or an ancestor of it. */
export function getDescendantChain(cwd: string, targetDir: string): string[] {
  const relative = path.relative(cwd, targetDir);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    return [];
  }
  const segments = relative.split(path.sep);
  const chain: string[] = [];
  let current = cwd;
  for (const segment of segments) {
    current = path.join(current, segment);
    chain.push(current);
  }
  return chain;
}

/** Start offset of each line (0-based), for fast offset->line/column lookups on one file's content. */
export function buildLineIndex(content: string): number[] {
  const starts = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") {
      starts.push(i + 1);
    }
  }
  return starts;
}

/** 1-based line/column for a character offset, using an index from buildLineIndex. */
export function positionAt(lineStarts: number[], offset: number): { line: number; column: number } {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if ((lineStarts[mid] ?? 0) <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  const lineStart = lineStarts[lo] ?? 0;
  return { line: lo + 1, column: offset - lineStart + 1 };
}

/**
 * The directory to treat as `targetPath`'s location - itself, if it is
 * already an existing directory; otherwise its parent, since a `targetPath`
 * commonly names a file that doesn't exist yet (one Claude is expected to
 * create or edit).
 */
export async function targetDirectory(absoluteTargetPath: string): Promise<string> {
  try {
    const stat = await fs.stat(absoluteTargetPath);
    return stat.isDirectory() ? absoluteTargetPath : path.dirname(absoluteTargetPath);
  } catch {
    return path.dirname(absoluteTargetPath);
  }
}

export async function readFileIfExists(absolutePath: string): Promise<string | undefined> {
  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) {
      return undefined;
    }
    return await fs.readFile(absolutePath, "utf8");
  } catch {
    return undefined;
  }
}
