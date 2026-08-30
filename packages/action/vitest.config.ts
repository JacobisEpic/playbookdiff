import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each test materializes real Git worktrees and/or spawns the bundled
    // Action as a subprocess twice; under full monorepo test parallelism the
    // default 5s timeout is occasionally too tight even though no test
    // actually hangs.
    testTimeout: 30_000,
  },
});
