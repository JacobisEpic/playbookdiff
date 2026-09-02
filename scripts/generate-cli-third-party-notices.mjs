import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const distributionRoot = path.join(repositoryRoot, "packages", "cli");
const outputPath = path.join(distributionRoot, "THIRD_PARTY_NOTICES.md");
const distFiles = await readdir(path.join(distributionRoot, "dist"));
const bundleMapName = distFiles.find((filename) => /^cli-.*\.js\.map$/.test(filename));
assert.ok(bundleMapName, "build the CLI before generating third-party notices");

const bundleMapPath = path.join(distributionRoot, "dist", bundleMapName);
const bundleMap = JSON.parse(await readFile(bundleMapPath, "utf8"));
const packages = new Map();
const packagePattern = /^(.*?node_modules\/\.pnpm\/[^/]+\/node_modules\/((?:@[^/]+\/)?[^/]+))\//;

for (const source of bundleMap.sources) {
  const match = source.match(packagePattern);
  if (!match) continue;
  packages.set(match[2], path.resolve(path.dirname(bundleMapPath), match[1]));
}

const formatLicense = `MIT License

Copyright 2010 - 2014 Sami Samhuri <sami@samhuri.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const entries = [];
for (const [name, packageRoot] of [...packages].sort(([left], [right]) =>
  left.localeCompare(right),
)) {
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  const packageFiles = await readdir(packageRoot);
  const licenseFilename = packageFiles.find((filename) => /^licen[cs]e$/i.test(filename));
  const licenseText = licenseFilename
    ? (await readFile(path.join(packageRoot, licenseFilename), "utf8")).trim()
    : name === "format"
      ? formatLicense
      : undefined;
  assert.ok(licenseText, `bundled package ${name} has no recognized license text`);
  const license =
    packageJson.license ??
    packageJson.licenses?.map((entry) => entry.type).join(" OR ") ??
    "See included license text";
  entries.push({ name, version: packageJson.version, license, licenseText });
}

const licenseGroups = new Map();
for (const entry of entries) {
  const digest = createHash("sha256").update(entry.licenseText).digest("hex");
  const group = licenseGroups.get(digest) ?? { packages: [], text: entry.licenseText };
  group.packages.push(`${entry.name}@${entry.version}`);
  licenseGroups.set(digest, group);
}

const lines = [
  "# Third-party notices",
  "",
  "The `playbookdiff` npm distribution bundles the packages listed below.",
  "Their license notices are reproduced here because the installed artifact has no separate runtime dependency tree.",
  "This file is generated from the exact packages represented in the built CLI source map.",
  "",
  "## Bundled packages",
  "",
  ...entries.map((entry) => `- \`${entry.name}@${entry.version}\` - ${entry.license}`),
  "",
  "## License texts",
  "",
];

for (const group of licenseGroups.values()) {
  lines.push(`### ${group.packages.join(", ")}`, "", "```text", group.text, "```", "");
}

const output = `${lines.join("\n").trimEnd()}\n`;
if (process.argv.includes("--check")) {
  const existing = await readFile(outputPath, "utf8").catch(() => "");
  if (existing !== output) {
    throw new Error(
      "packages/cli/THIRD_PARTY_NOTICES.md is stale; run pnpm cli:third-party-notices",
    );
  }
} else {
  await writeFile(outputPath, output);
  console.log(`Wrote notices for ${entries.length} bundled packages.`);
}
