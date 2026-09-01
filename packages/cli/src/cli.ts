import { defineCommand, runCommand, showUsage } from "citty";
import type { CommandDef } from "citty";
import { runCheck } from "./commands/check.js";
import { runDiff } from "./commands/diff.js";
import { runExplain } from "./commands/explain.js";
import { EXIT_ANALYSIS_ERROR, EXIT_SUCCESS } from "./exit-codes.js";
import { readCliVersion } from "./version.js";

function writeOutcome(outcome: { stdout?: string; stderr?: string }): void {
  if (outcome.stdout !== undefined) process.stdout.write(`${outcome.stdout}\n`);
  if (outcome.stderr !== undefined) process.stderr.write(`${outcome.stderr}\n`);
}

const checkCommand = defineCommand({
  meta: {
    name: "check",
    description: "Compare Claude Code and Codex effective repository configuration.",
  },
  args: {
    repository: {
      type: "positional",
      description: "Repository to analyze.",
      required: false,
      default: ".",
    },
    cwd: {
      type: "string",
      description:
        "Model the directory the coding agent was launched from, relative to the repository.",
      default: ".",
    },
    path: {
      type: "string",
      description:
        "Model the repository path the coding agent is working on, relative to the repository.",
    },
    json: {
      type: "boolean",
      description: "Print machine-readable JSON to stdout instead of human-readable text.",
    },
  },
  async run({ args }) {
    const outcome = await runCheck({
      repository: args.repository,
      cwd: args.cwd,
      ...(args.path !== undefined && args.path !== "" ? { targetPath: args.path } : {}),
      // With no --path, contexts are derived from the paths the range changed,
      // so running this locally answers the same question CI answers. An
      // explicit --path still analyzes exactly that one context.
      deriveTargets: true,
      json: args.json === true,
    });
    writeOutcome(outcome);
    return outcome.exitCode;
  },
});

const explainCommand = defineCommand({
  meta: {
    name: "explain",
    description: "Explain a specific compatibility finding by its stable ID.",
  },
  args: {
    "finding-id": {
      type: "positional",
      description: "Stable finding ID reported by `check`.",
      required: true,
    },
    repository: {
      type: "positional",
      description: "Repository to analyze.",
      required: false,
      default: ".",
    },
    cwd: {
      type: "string",
      description:
        "Model the directory the coding agent was launched from, relative to the repository.",
      default: ".",
    },
    path: {
      type: "string",
      description:
        "Model the repository path the coding agent is working on, relative to the repository.",
    },
    json: {
      type: "boolean",
      description: "Print machine-readable JSON to stdout instead of human-readable text.",
    },
  },
  async run({ args }) {
    const outcome = await runExplain({
      findingId: args["finding-id"],
      repository: args.repository,
      cwd: args.cwd,
      ...(args.path !== undefined && args.path !== "" ? { targetPath: args.path } : {}),
      // With no --path, contexts are derived from the paths the range changed,
      // so running this locally answers the same question CI answers. An
      // explicit --path still analyzes exactly that one context.
      deriveTargets: true,
      json: args.json === true,
    });
    writeOutcome(outcome);
    return outcome.exitCode;
  },
});

const diffCommand = defineCommand({
  meta: {
    name: "diff",
    description:
      "Compare Claude Code and Codex compatibility across two Git revisions and report only newly introduced regressions.",
  },
  args: {
    range: {
      type: "positional",
      description:
        'Exactly "BASELINE..CANDIDATE" (two revisions separated by ".."). Analyzes exactly those two commits; does not use merge-base semantics, and never fetches a remote.',
      required: true,
    },
    repository: {
      type: "positional",
      description: "Repository to analyze.",
      required: false,
      default: ".",
    },
    cwd: {
      type: "string",
      description:
        "Model the directory the coding agent was launched from, relative to the repository, at both revisions.",
      default: ".",
    },
    path: {
      type: "string",
      description:
        "Model the repository path the coding agent is working on, relative to the repository, at both revisions.",
    },
    json: {
      type: "boolean",
      description: "Print machine-readable JSON to stdout instead of human-readable text.",
    },
  },
  async run({ args }) {
    const outcome = await runDiff({
      range: args.range,
      repository: args.repository,
      cwd: args.cwd,
      ...(args.path !== undefined && args.path !== "" ? { targetPath: args.path } : {}),
      // With no --path, contexts are derived from the paths the range changed,
      // so running this locally answers the same question CI answers. An
      // explicit --path still analyzes exactly that one context.
      deriveTargets: true,
      json: args.json === true,
    });
    writeOutcome(outcome);
    return outcome.exitCode;
  },
});

const mainCommand = defineCommand({
  meta: {
    name: "playbookdiff",
    version: readCliVersion(),
    description: "Read-only Claude Code <-> Codex repository compatibility analyzer.",
  },
  subCommands: { check: checkCommand, explain: explainCommand, diff: diffCommand },
});

/**
 * `showUsage`'s two parameters share one type parameter, which TypeScript
 * cannot unify across `checkCommand`/`explainCommand`/`mainCommand` since
 * each has its own distinct, precisely-inferred `args` shape. Usage rendering
 * only reads `meta`/`args` generically, so `CommandDef<any>` here is a
 * narrow, deliberate escape hatch rather than a loss of real type safety.
 */
async function showUsageFor(cmd: CommandDef<any>, parent?: CommandDef<any>): Promise<void> {
  await showUsage(cmd, parent);
}

async function showHelpFor(rawArgs: readonly string[]): Promise<void> {
  if (rawArgs[0] === "check") {
    await showUsageFor(checkCommand, mainCommand);
  } else if (rawArgs[0] === "explain") {
    await showUsageFor(explainCommand, mainCommand);
  } else if (rawArgs[0] === "diff") {
    await showUsageFor(diffCommand, mainCommand);
  } else {
    await showUsageFor(mainCommand);
  }
}

function reportUnexpectedError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  return EXIT_ANALYSIS_ERROR;
}

/**
 * Parses `rawArgs` and runs the requested command, returning the process exit
 * code. This never calls `process.exit` itself so it stays testable; only
 * `bin.ts` translates the return value into an actual process exit.
 */
export async function runCli(rawArgs: readonly string[]): Promise<number> {
  if (rawArgs.length === 0) {
    await showUsage(mainCommand);
    return EXIT_SUCCESS;
  }

  if (rawArgs.some((arg) => arg === "--help" || arg === "-h")) {
    await showHelpFor(rawArgs);
    return EXIT_SUCCESS;
  }

  if (rawArgs.length === 1 && (rawArgs[0] === "--version" || rawArgs[0] === "-v")) {
    process.stdout.write(`${readCliVersion()}\n`);
    return EXIT_SUCCESS;
  }

  const [name, ...rest] = rawArgs;
  try {
    if (name === "check") {
      const { result } = await runCommand(checkCommand, { rawArgs: [...rest] });
      return result as number;
    }
    if (name === "explain") {
      const { result } = await runCommand(explainCommand, { rawArgs: [...rest] });
      return result as number;
    }
    if (name === "diff") {
      const { result } = await runCommand(diffCommand, { rawArgs: [...rest] });
      return result as number;
    }
  } catch (error) {
    return reportUnexpectedError(error);
  }

  process.stderr.write(`Error: Unknown command "${name}"\n`);
  await showUsage(mainCommand);
  return EXIT_ANALYSIS_ERROR;
}
