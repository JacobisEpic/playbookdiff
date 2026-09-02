import { defineConfig } from "tsdown";

/**
 * GitHub does not install dependencies before running a `uses:` JavaScript
 * action - the committed bundle must be fully self-contained. `alwaysBundle`
 * forces every import (workspace packages and `@actions/core` alike) to be
 * inlined rather than left as an external `node_modules` import.
 */
export default defineConfig({
  clean: true,
  deps: { alwaysBundle: () => true, onlyBundle: false },
  dts: false,
  entry: ["src/index.ts"],
  format: "esm",
  outExtensions: () => ({ js: ".mjs" }),
  platform: "node",
  sourcemap: false,
});
