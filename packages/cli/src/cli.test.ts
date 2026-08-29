import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "./cli.js";
import { EXIT_ANALYSIS_ERROR, EXIT_SUCCESS } from "./exit-codes.js";
import { parityFixture } from "./test-fixtures.js";

let stdout: string[];
let stderr: string[];

beforeEach(() => {
  stdout = [];
  stderr = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
    stderr.push(String(chunk));
    return true;
  });
  vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    stdout.push(`${args.join(" ")}\n`);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runCli", () => {
  it("bare invocation shows top-level usage and exits 0", async () => {
    const code = await runCli([]);
    expect(code).toBe(EXIT_SUCCESS);
    expect(stdout.join("")).toContain("USAGE");
    expect(stdout.join("")).toContain("check");
    expect(stdout.join("")).toContain("explain");
  });

  it("--help shows top-level usage and exits 0", async () => {
    const code = await runCli(["--help"]);
    expect(code).toBe(EXIT_SUCCESS);
    expect(stdout.join("")).toContain("USAGE");
  });

  it("check --help shows check-specific usage and exits 0", async () => {
    const code = await runCli(["check", "--help"]);
    expect(code).toBe(EXIT_SUCCESS);
    expect(stdout.join("")).toContain("--cwd");
    expect(stdout.join("")).toContain("--path");
    expect(stdout.join("")).toContain("--json");
  });

  it("explain --help shows explain-specific usage and exits 0", async () => {
    const code = await runCli(["explain", "--help"]);
    expect(code).toBe(EXIT_SUCCESS);
    expect(stdout.join("")).toContain("FINDING-ID");
  });

  it("--version prints the package version and exits 0", async () => {
    const code = await runCli(["--version"]);
    expect(code).toBe(EXIT_SUCCESS);
    expect(stdout.join("")).toMatch(/^\d+\.\d+\.\d+\n$/);
  });

  it("an unknown command exits 2 with a clean error and usage", async () => {
    const code = await runCli(["bogus-command"]);
    expect(code).toBe(EXIT_ANALYSIS_ERROR);
    expect(stderr.join("")).toContain('Unknown command "bogus-command"');
  });

  it("explain without a finding-id exits 2 with a clean error, no stack trace", async () => {
    const code = await runCli(["explain"]);
    expect(code).toBe(EXIT_ANALYSIS_ERROR);
    expect(stderr.join("")).toMatch(/^Error: /);
    expect(stderr.join("")).not.toContain(".ts:");
  });

  it("dispatches `check` with a repository argument and exits based on findings", async () => {
    const code = await runCli(["check", parityFixture]);
    expect(code).toBe(EXIT_SUCCESS);
    expect(stdout.join("")).toContain("PlaybookDiff");
  });

  it("dispatches `check --json` and prints only valid JSON to stdout", async () => {
    const code = await runCli(["check", parityFixture, "--json"]);
    expect(code).toBe(EXIT_SUCCESS);
    expect(() => JSON.parse(stdout.join(""))).not.toThrow();
    expect(stderr).toEqual([]);
  });
});
