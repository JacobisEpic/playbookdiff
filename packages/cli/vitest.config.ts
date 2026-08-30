import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Git-worktree materialization and built-binary tests spawn real
    // subprocesses; under full monorepo test parallelism the default 5s
    // timeout is occasionally too tight even though no test actually hangs.
    testTimeout: 30_000,
  },
});
