import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  // The package is a self-contained executable. Bundling workspace code and
  // third-party runtime libraries removes workspace resolution and registry
  // access from installation of the packed artifact.
  deps: { alwaysBundle: () => true, onlyBundle: false },
  dts: { sourcemap: true },
  entry: ["src/index.ts", "src/bin.ts"],
  format: "esm",
  outExtensions: () => ({ dts: ".d.ts", js: ".js" }),
  platform: "node",
  sourcemap: true,
});
