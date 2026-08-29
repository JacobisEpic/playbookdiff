import { createHash } from "node:crypto";
import type { FindingCategory, FindingType } from "../types/index.js";

export type FindingIdParts = {
  category: FindingCategory;
  type: FindingType;
  logicalKey: string;
  aspect: string;
  direction?: "left" | "right";
};

function readableSlug(value: string): string {
  const slug = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug.length > 0 ? slug : "entity";
}

export function stableDigest(parts: readonly string[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 12);
}

export function createFindingId(parts: FindingIdParts): string {
  const direction = parts.direction ?? "both";
  const digest = stableDigest([
    "playbookdiff-finding-v1",
    parts.category,
    parts.type,
    parts.logicalKey,
    parts.aspect,
    direction,
  ]);
  const directionSegment = parts.direction ? `${parts.direction}:` : "";
  return `${parts.category}:${parts.type}:${directionSegment}${readableSlug(parts.logicalKey)}:${digest}`;
}
