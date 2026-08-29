import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  AdvertisementState,
  Diagnostic,
  EffectiveSkill,
  InvocationState,
  ProvenanceRecord,
  SourceRef,
} from "@playbookdiff/core/types";
import { parseDocument } from "yaml";
import type { CodexConfig } from "./config.js";
import { configValueAt, isRecord, sourceForConfigPath } from "./config.js";
import { createDiagnostic, type IdRegistry } from "./diagnostics.js";
import { extractFrontmatter } from "./markdown.js";
import {
  getAncestorChain,
  isWithin,
  lineCount,
  readFileIfExists,
  toRepoRelativePosix,
  type ValidatedContext,
} from "./paths.js";

export type SkillDiscoveryResult = {
  skills: EffectiveSkill[];
  provenance: ProvenanceRecord[];
  diagnostics: Diagnostic[];
};

const AGGREGATE_MAX_CONTEXT_FRACTION = 0.02;
const AGGREGATE_FALLBACK_CHARS = 8_000;

function readString(data: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = data?.[key];
  return typeof value === "string" ? value : undefined;
}

async function listSkillEntries(skillsRoot: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

function wholeFileSource(relativePath: string, content: string, format: string): SourceRef {
  return {
    path: relativePath,
    lineStart: 1,
    lineEnd: lineCount(content),
    scope: "repository",
    format,
  };
}

async function readOpenAiMetadata(
  visibleSkillDir: string,
  realSkillDir: string,
  ctx: ValidatedContext,
  registry: IdRegistry,
  diagnostics: Diagnostic[],
): Promise<{
  implicit: InvocationState;
  advertisement: AdvertisementState;
  source?: SourceRef;
}> {
  const absolutePath = path.join(realSkillDir, "agents", "openai.yaml");
  const content = await readFileIfExists(absolutePath);
  if (content === undefined) return { implicit: "allowed", advertisement: "advertised" };
  const visiblePath = path.join(visibleSkillDir, "agents", "openai.yaml");
  const relativePath = toRepoRelativePosix(ctx.repositoryRoot, visiblePath);
  const source = wholeFileSource(relativePath, content, "yaml");
  const document = parseDocument(content);
  if (document.errors.length > 0) {
    diagnostics.push(
      createDiagnostic(registry, {
        level: "warning",
        code: "parse-error",
        slug: `openai-yaml:${relativePath}`,
        message: `Skill metadata is not valid YAML: ${relativePath}`,
        source,
        detail: document.errors.map((error) => error.message).join("; "),
      }),
    );
    return { implicit: "unknown", advertisement: "unknown", source };
  }
  const value = document.toJS() as unknown;
  const policy = isRecord(value) && isRecord(value.policy) ? value.policy : undefined;
  const allow = policy?.allow_implicit_invocation;
  if (allow === undefined || allow === true) {
    return { implicit: "allowed", advertisement: "advertised", source };
  }
  if (allow === false) return { implicit: "blocked", advertisement: "hidden", source };
  diagnostics.push(
    createDiagnostic(registry, {
      level: "warning",
      code: "parse-error",
      slug: `allow-implicit:${relativePath}`,
      message:
        "policy.allow_implicit_invocation must be a boolean; implicit invocation is unknown.",
      source,
    }),
  );
  return { implicit: "unknown", advertisement: "unknown", source };
}

export async function discoverSkills(
  ctx: ValidatedContext,
  config: CodexConfig,
  registry: IdRegistry,
): Promise<SkillDiscoveryResult> {
  const skills: EffectiveSkill[] = [];
  const provenance: ProvenanceRecord[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const layer of config.layers) {
    if (configValueAt(layer, ["skills", "config"]) !== undefined) {
      diagnostics.push(
        createDiagnostic(registry, {
          level: "warning",
          code: "unresolved",
          slug: `skills-config:${layer.path}`,
          message:
            "Repository-visible skills.config entries are preserved as unresolved configuration. Current official Codex documentation conflicts on whether each path names a skill directory or its SKILL.md file, so PlaybookDiff does not synthesize a discovery result from this setting.",
          source: sourceForConfigPath(layer, ["skills", "config"]),
        }),
      );
    }
  }

  const chain = getAncestorChain(ctx.repositoryRoot, ctx.cwd).reverse();
  for (const directory of chain) {
    const skillsRoot = path.join(directory, ".agents", "skills");
    for (const entryName of await listSkillEntries(skillsRoot)) {
      const visibleSkillDir = path.join(skillsRoot, entryName);
      let realSkillDir: string;
      try {
        realSkillDir = await fs.realpath(visibleSkillDir);
      } catch {
        continue;
      }
      const visibleSkillPath = path.join(visibleSkillDir, "SKILL.md");
      const relativeSkillPath = toRepoRelativePosix(ctx.repositoryRoot, visibleSkillPath);
      if (!isWithin(ctx.repositoryRoot, realSkillDir)) {
        diagnostics.push(
          createDiagnostic(registry, {
            level: "info",
            code: "outside-repository",
            slug: `skill-symlink:${relativeSkillPath}`,
            message: `Skill directory ${toRepoRelativePosix(ctx.repositoryRoot, visibleSkillDir)} resolves outside repositoryRoot and was not followed.`,
            source: { path: relativeSkillPath, scope: "repository", format: "markdown" },
          }),
        );
        continue;
      }
      const content = await readFileIfExists(path.join(realSkillDir, "SKILL.md"));
      if (content === undefined) continue;
      const source = wholeFileSource(relativeSkillPath, content, "markdown");
      const frontmatter = extractFrontmatter(content);
      if (frontmatter.parseError) {
        diagnostics.push(
          createDiagnostic(registry, {
            level: "warning",
            code: "parse-error",
            slug: `skill-frontmatter:${relativeSkillPath}`,
            message: `Skill frontmatter could not be parsed as YAML: ${relativeSkillPath}`,
            source,
          }),
        );
      }
      const declaredName = readString(frontmatter.data, "name");
      const description = readString(frontmatter.data, "description");
      const metadataValid =
        !frontmatter.parseError && declaredName !== undefined && description !== undefined;
      const name = declaredName ?? entryName;
      if (!frontmatter.parseError && !metadataValid) {
        diagnostics.push(
          createDiagnostic(registry, {
            level: "warning",
            code: "parse-error",
            slug: `skill-required-metadata:${relativeSkillPath}`,
            message: `Skill ${relativeSkillPath} is missing a string name or description in YAML frontmatter, so runtime discovery and invocation are unknown.`,
            source,
          }),
        );
      }
      const metadata = await readOpenAiMetadata(
        visibleSkillDir,
        realSkillDir,
        ctx,
        registry,
        diagnostics,
      );
      const metadataSources: SourceRef[] = [];
      if (frontmatter.lineStart !== undefined && frontmatter.lineEnd !== undefined) {
        metadataSources.push({
          path: relativeSkillPath,
          lineStart: frontmatter.lineStart,
          lineEnd: frontmatter.lineEnd,
          scope: "repository",
          format: "yaml",
        });
      }
      if (metadata.source) metadataSources.push(metadata.source);
      const metadataUnknown = !metadataValid;
      const id = registry.unique(`codex:skill:${relativeSkillPath}`);
      skills.push({
        id,
        name,
        path: relativeSkillPath,
        source,
        discovery: {
          state: metadataUnknown ? "unknown" : "available",
          reason: `Discovered from ${toRepoRelativePosix(ctx.repositoryRoot, skillsRoot)} while searching cwd upward to repositoryRoot.`,
        },
        invocation: {
          explicit: metadataUnknown ? "unknown" : "allowed",
          implicit: metadataUnknown ? "unknown" : metadata.implicit,
        },
        advertisement: {
          state: metadataUnknown ? "unknown" : metadata.advertisement,
          aggregateBudget: {
            maxContextFraction: AGGREGATE_MAX_CONTEXT_FRACTION,
            fallbackChars: AGGREGATE_FALLBACK_CHARS,
          },
        },
        ...(description !== undefined ? { description } : {}),
        ...(metadataSources.length > 0 ? { metadataSources } : {}),
      });
      provenance.push({
        effectiveId: id,
        sources: [source, ...metadataSources],
        resolution: { strategy: "matched" },
      });
    }
  }

  const repositoryVisibleChars = skills.reduce(
    (total, skill) =>
      total + skill.name.length + (skill.description?.length ?? 0) + skill.path.length,
    0,
  );
  if (repositoryVisibleChars > AGGREGATE_FALLBACK_CHARS) {
    for (const skill of skills) {
      if (skill.advertisement.state === "advertised") skill.advertisement.state = "budget-risk";
    }
    diagnostics.push(
      createDiagnostic(registry, {
        level: "info",
        code: "budget-risk",
        slug: "skill-advertisement-aggregate",
        message: `Repository-visible skill metadata totals ${repositoryVisibleChars} characters, exceeding Codex's documented ${AGGREGATE_FALLBACK_CHARS}-character fallback budget. User and managed skills may consume additional budget, so exact runtime advertisement remains unknown.`,
      }),
    );
  }

  return { skills, provenance, diagnostics };
}
