export type SourceScope = "user" | "repository" | "directory" | "local" | "managed" | "unknown";

/** A location that contributed evidence without embedding analyzer-local paths. */
export type SourceRef = {
  path: string;
  lineStart?: number;
  lineEnd?: number;
  scope: SourceScope;
  format?: string;
};
