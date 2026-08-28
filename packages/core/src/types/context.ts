/** Controls whether analysis is reproducible or may include machine-local state. */
export type AnalysisMode = "repo" | "local";

/**
 * Identifies the repository, launch directory, and optional work target whose
 * harness configuration should be compiled.
 */
export type AnalysisContext = {
  repositoryRoot: string;
  cwd: string;
  targetPath?: string;
  mode: AnalysisMode;
};
