/**
 * Result of running a command's business logic, kept separate from process
 * I/O so commands stay testable without touching `process.stdout`/`exit`.
 */
export type CommandOutcome = {
  exitCode: number;
  stdout?: string;
  stderr?: string;
};
