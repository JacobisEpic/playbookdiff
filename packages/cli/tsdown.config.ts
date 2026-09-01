import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  // The workspace packages are internal build units, not separately published
  // artifacts, so they are bundled into this package's output. Leaving them as
  // external imports would put unresolvable `workspace:*` dependencies in the
  // published manifest and make the package uninstallable.
  noExternal: [/^@playbookdiff\//],
  dts: { sourcemap: true },
  entry: ["src/index.ts", "src/bin.ts"],
  format: "esm",
  outExtensions: () => ({ dts: ".d.ts", js: ".js" }),
  platform: "node",
  sourcemap: true,
});
