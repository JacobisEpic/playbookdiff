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

export function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function realpathAllowingMissingTail(candidate: string): Promise<string> {
  try {
    return await fs.realpath(candidate);
  } catch {
    const parent = path.dirname(candidate);
    if (parent === candidate) return candidate;
    return path.join(await realpathAllowingMissingTail(parent), path.basename(candidate));
  }
}

export async function validateAnalysisContext(context: {
  repositoryRoot: string;
  cwd: string;
  targetPath?: string;
  mode: "repo" | "local";
}): Promise<ValidatedContext> {
  const repositoryRoot = await realDirectory("repositoryRoot", context.repositoryRoot);
  const cwd = await realDirectory("cwd", path.resolve(repositoryRoot, context.cwd));
  if (!isWithin(repositoryRoot, cwd)) {
    throw new AnalysisContextError(
      `cwd (${cwd}) does not resolve inside repositoryRoot (${repositoryRoot})`,
    );
  }
  if (context.targetPath === undefined) return { repositoryRoot, cwd, mode: context.mode };
  const targetPath = await realpathAllowingMissingTail(
    path.resolve(repositoryRoot, context.targetPath),
  );
  if (!isWithin(repositoryRoot, targetPath)) {
    throw new AnalysisContextError(
      `targetPath (${targetPath}) does not resolve inside repositoryRoot (${repositoryRoot})`,
    );
  }
  return { repositoryRoot, cwd, targetPath, mode: context.mode };
}

export function toRepoRelativePosix(root: string, absolutePath: string): string {
  const relative = path.relative(root, absolutePath);
  return relative === "" ? "." : relative.split(path.sep).join("/");
}

export function getAncestorChain(root: string, cwd: string): string[] {
  const relative = path.relative(root, cwd);
  if (relative === "") return [root];
  const result = [root];
  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    result.push(current);
  }
  return result;
}

export async function readFileIfExists(absolutePath: string): Promise<string | undefined> {
  try {
    const stat = await fs.stat(absolutePath);
    return stat.isFile() ? await fs.readFile(absolutePath, "utf8") : undefined;
  } catch {
    return undefined;
  }
}

export function lineCount(content: string): number {
  return content.length === 0 ? 1 : content.split("\n").length;
}
