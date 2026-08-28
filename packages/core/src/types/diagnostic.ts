import type { SourceRef } from "./source.js";

export type DiagnosticLevel = "error" | "warning" | "info";

export type DiagnosticCode =
  | "unsupported"
  | "unresolved"
  | "assumption"
  | "parse-error"
  | "outside-repository"
  | "runtime-unknown"
  | "local-config-unavailable"
  | "managed-config-unavailable"
  | "budget-risk"
  | "other";

export type Diagnostic = {
  id: string;
  level: DiagnosticLevel;
  code: DiagnosticCode;
  message: string;
  source?: SourceRef;
  detail?: string;
};
