import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  Diagnostic,
  EffectiveSkill,
  ProvenanceRecord,
  SourceRef,
} from "@playbookdiff/core/types";
import { createDiagnostic, type IdRegistry } from "./diagnostics.js";
import { extractFrontmatter } from "./markdown.js";
import {
  getAncestorChain,
  getDescendantChain,
  readFileIfExists,
  resolveCandidate,
  targetDirectory,
  toRepoRelativePosix,
  type ValidatedContext,
} from "./paths.js";
import { matchesClaudeRulePath, readPathsField } from "./rules.js";

export type SkillDiscoveryResult = {
  skills: EffectiveSkill[];
  provenance: ProvenanceRecord[];
  diagnostics: Diagnostic[];
};

/** Documented per-skill advertisement cap: combined description + when_to_use text. */
const DESCRIPTION_LIMIT_CHARS = 1536;
/** Documented aggregate skill-listing budget as a fraction of the model context window. */
const AGGREGATE_MAX_CONTEXT_FRACTION = 0.01;

const TRUE_VALUES = new Set(["true", "yes", "on", "1"]);
const FALSE_VALUES = new Set(["false", "no", "off", "0"]);

function parseSkillBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
  }
  return undefined;
}

function readStringField(
  data: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = data?.[key];
  return typeof value === "string" ? value : undefined;
}

async function listSkillDirectories(skillsRoot: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(skillsRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  // A symlinked entry is kept as a candidate and resolved by the caller: a
  // `Dirent` reports a symlink-to-directory as a symlink rather than a
  // directory, so filtering on `isDirectory()` alone would silently drop a
  // skill directory that is shared by symlink - a common way to hand the same
  // SKILL.md to both harnesses - and report it as missing from Claude Code.
  return entries
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export async function discoverSkills(
  ctx: ValidatedContext,
  registry: IdRegistry,
): Promise<SkillDiscoveryResult> {
  const skills: EffectiveSkill[] = [];
  const provenance: ProvenanceRecord[] = [];
  const diagnostics: Diagnostic[] = [];
  const byName = new Map<string, string[]>();

  function relPath(absolutePath: string): string {
    return toRepoRelativePosix(ctx.repositoryRoot, absolutePath);
  }

  const targetRelPath = ctx.targetPath ? relPath(ctx.targetPath) : undefined;

  async function processSkillsRoot(
    skillsRoot: string,
    discoveryState: "available" | "conditional",
    reason: string,
  ): Promise<void> {
    const directories = await listSkillDirectories(skillsRoot);
    for (const dirName of directories) {
      const skillDir = path.join(skillsRoot, dirName);
      const skillMdPath = path.join(skillDir, "SKILL.md");
      // Provenance keeps the visible path, so a symlinked skill still reports
      // where Claude Code finds it; only the read follows the link.
      const resolvedSkillDir = await resolveCandidate(ctx.repositoryRoot, skillsRoot, dirName);
      if (!resolvedSkillDir.exists) {
        continue;
      }
      if (!resolvedSkillDir.insideRoot) {
        diagnostics.push(
          createDiagnostic(registry, {
            level: "info",
            code: "outside-repository",
            slug: `skill-symlink:${relPath(skillMdPath)}`,
            message: `Skill directory ${relPath(skillDir)} resolves outside repositoryRoot and was not followed.`,
            source: { path: relPath(skillMdPath), scope: "repository", format: "markdown" },
          }),
        );
        continue;
      }
      const content = await readFileIfExists(path.join(resolvedSkillDir.absolutePath, "SKILL.md"));
      if (content === undefined) {
        continue;
      }
      const frontmatter = extractFrontmatter(content);
      if (frontmatter.parseError) {
        diagnostics.push(
          createDiagnostic(registry, {
            level: "warning",
            code: "parse-error",
            slug: `skill-frontmatter:${relPath(skillMdPath)}`,
            message: `Skill frontmatter could not be parsed as YAML: ${relPath(skillMdPath)}`,
            source: { path: relPath(skillMdPath), scope: "repository", format: "markdown" },
          }),
        );
      }

      const data = frontmatter.data;
      const name = readStringField(data, "name") ?? dirName;
      const description = readStringField(data, "description");
      const whenToUse = readStringField(data, "when_to_use");
      const disableModelInvocation = parseSkillBoolean(data?.["disable-model-invocation"]) ?? false;
      const userInvocable = parseSkillBoolean(data?.["user-invocable"]) ?? true;

      const explicit = userInvocable ? "allowed" : "blocked";
      const implicit = disableModelInvocation ? "blocked" : "allowed";

      const source: SourceRef = {
        path: relPath(skillMdPath),
        scope: "repository",
        format: "markdown",
      };
      const metadataSources: SourceRef[] = [];
      if (frontmatter.lineStart !== undefined && frontmatter.lineEnd !== undefined) {
        metadataSources.push({
          path: relPath(skillMdPath),
          lineStart: frontmatter.lineStart,
          lineEnd: frontmatter.lineEnd,
          scope: "repository",
          format: "yaml",
        });
      }

      const id = `claude:skill:${relPath(skillMdPath)}`;

      let advertisementState: "advertised" | "hidden" | "budget-risk" = disableModelInvocation
        ? "hidden"
        : "advertised";
      const combinedLength = (description?.length ?? 0) + (whenToUse?.length ?? 0);
      if (advertisementState === "advertised" && combinedLength > DESCRIPTION_LIMIT_CHARS) {
        advertisementState = "budget-risk";
        diagnostics.push(
          createDiagnostic(registry, {
            level: "info",
            code: "budget-risk",
            slug: `skill-advertisement:${relPath(skillMdPath)}`,
            message: `Skill "${name}" description and when_to_use combine to ${combinedLength} characters, exceeding the documented ${DESCRIPTION_LIMIT_CHARS}-character advertisement cap. Its listed description is likely truncated.`,
            source,
          }),
        );
      }

      // `paths` frontmatter conditions implicit invocation, not raw
      // discovery - the SKILL.md was still found, so discovery.state stays
      // as-is regardless of whether a target matches its paths.
      const paths = readPathsField(data);
      let conditionedImplicit: "allowed" | "blocked" | "unknown" | undefined;
      if (paths && paths.length > 0) {
        if (!targetRelPath) {
          conditionedImplicit = implicit === "blocked" ? "blocked" : "unknown";
          diagnostics.push(
            createDiagnostic(registry, {
              level: "info",
              code: "assumption",
              slug: `skill-paths-conditional:${relPath(skillMdPath)}`,
              message: `Skill "${name}" has paths frontmatter (${paths.join(", ")}) conditioning automatic activation; no targetPath was supplied, so implicit-invocation applicability is unknown.`,
              source,
            }),
          );
        } else {
          conditionedImplicit = matchesClaudeRulePath(paths, targetRelPath) ? "allowed" : "blocked";
        }
      }

      const skill: EffectiveSkill = {
        id,
        name,
        path: relPath(skillMdPath),
        source,
        discovery: { state: discoveryState, reason },
        invocation: {
          explicit,
          implicit: conditionedImplicit ?? implicit,
        },
        advertisement: {
          state: advertisementState,
          descriptionLimitChars: DESCRIPTION_LIMIT_CHARS,
          aggregateBudget: { maxContextFraction: AGGREGATE_MAX_CONTEXT_FRACTION },
        },
        ...(description !== undefined ? { description } : {}),
        ...(metadataSources.length > 0 ? { metadataSources } : {}),
      };
      skills.push(skill);
      provenance.push({ effectiveId: id, sources: [source], resolution: { strategy: "matched" } });

      const existing = byName.get(name) ?? [];
      existing.push(id);
      byName.set(name, existing);
    }
  }

  const ancestorChain = getAncestorChain(ctx.repositoryRoot, ctx.cwd);
  for (const dir of ancestorChain) {
    await processSkillsRoot(
      path.join(dir, ".claude", "skills"),
      "available",
      `Discovered via ancestor .claude/skills/ directory at ${relPath(dir)}`,
    );
  }

  if (ctx.targetPath) {
    const targetDir = await targetDirectory(ctx.targetPath);
    const descendantChain = getDescendantChain(ctx.cwd, targetDir);
    for (const dir of descendantChain) {
      await processSkillsRoot(
        path.join(dir, ".claude", "skills"),
        "conditional",
        `Discovered via a descendant .claude/skills/ directory at ${relPath(dir)}, reachable from targetPath; becomes available once Claude reads or edits a file in this subtree.`,
      );
    }
  }

  for (const skill of skills) {
    const siblings = (byName.get(skill.name) ?? []).filter((otherId) => otherId !== skill.id);
    if (siblings.length > 0) {
      skill.crossReferences = siblings;
      diagnostics.push(
        createDiagnostic(registry, {
          level: "info",
          code: "assumption",
          slug: `skill-name-collision:${skill.path}`,
          message: `Skill "${skill.name}" at ${skill.path} shares its name with another discovered skill. Claude Code is documented to give a colliding skill a directory-qualified invocation identifier (e.g. "apps/web:deploy"), and this was independently observed live (not just documented) during Phase 2 development. But qualification is collision-driven, not nesting-driven, and the collision check also spans skills/commands outside repo-mode visibility (bundled, user, plugin), so PlaybookDiff cannot reliably predict the exact identifier from repository state alone; both variants are preserved separately and cross-referenced instead.`,
          source: skill.source,
        }),
      );
    }
  }

  return { skills, provenance, diagnostics };
}
