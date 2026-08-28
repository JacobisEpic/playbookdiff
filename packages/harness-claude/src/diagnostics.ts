import type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticLevel,
  SourceRef,
} from "@playbookdiff/core/types";

/** Keeps generated ids unique within one compileClaudeConfig() call without needing global state. */
export class IdRegistry {
  private readonly seen = new Map<string, number>();

  unique(base: string): string {
    const count = this.seen.get(base) ?? 0;
    this.seen.set(base, count + 1);
    return count === 0 ? base : `${base}#${count + 1}`;
  }
}

export type CreateDiagnosticParams = {
  level: DiagnosticLevel;
  code: DiagnosticCode;
  message: string;
  slug: string;
  source?: SourceRef;
  detail?: string;
};

export function createDiagnostic(registry: IdRegistry, params: CreateDiagnosticParams): Diagnostic {
  return {
    id: registry.unique(`claude:diagnostic:${params.code}:${params.slug}`),
    level: params.level,
    code: params.code,
    message: params.message,
    ...(params.source ? { source: params.source } : {}),
    ...(params.detail ? { detail: params.detail } : {}),
  };
}
