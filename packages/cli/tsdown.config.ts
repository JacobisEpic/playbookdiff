import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: { sourcemap: true },
  entry: ["src/index.ts", "src/bin.ts"],
  format: "esm",
  outExtensions: () => ({ dts: ".d.ts", js: ".js" }),
  platform: "node",
  sourcemap: true,
});
