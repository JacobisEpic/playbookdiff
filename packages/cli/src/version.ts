import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Single source of truth for `--version`: the CLI package's own package.json. */
export function readCliVersion(): string {
  const pkg = require("../package.json") as { version: string };
  return pkg.version;
}
