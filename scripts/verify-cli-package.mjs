import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const packageRoot = path.join(repositoryRoot, "packages", "cli");
const fixture = path.join(
  repositoryRoot,
  "packages",
  "harness-codex",
  "test",
  "fixtures",
  "comparison",
  "parity",
);
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "playbookdiff-package-"));
const packDirectory = path.join(temporaryRoot, "pack");
const consumerDirectory = path.join(temporaryRoot, "consumer");
const npmCache = path.join(temporaryRoot, "npm-cache");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, CI: "true", npm_config_cache: npmCache },
  });
  const expectedStatus = options.expectedStatus ?? 0;
  if (result.status !== expectedStatus) {
    throw new Error(
      [
        `${command} ${args.join(" ")} exited ${String(result.status)} instead of ${expectedStatus}.`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return { stdout: result.stdout, stderr: result.stderr };
}

try {
  await Promise.all([
    mkdir(packDirectory, { recursive: true }),
    mkdir(consumerDirectory, { recursive: true }),
  ]);

  run("pnpm", ["--filter", "playbookdiff", "build"]);
  run("node", ["scripts/generate-cli-third-party-notices.mjs", "--check"]);
  const packed = run("npm", ["pack", "--json", "--pack-destination", packDirectory], {
    cwd: packageRoot,
  });
  const [packResult] = JSON.parse(packed.stdout);
  assert.ok(packResult, "npm pack returned no package result");

  const packedPaths = new Set(packResult.files.map((file) => file.path));
  for (const requiredPath of [
    "LICENSE",
    "README.md",
    "THIRD_PARTY_NOTICES.md",
    "package.json",
    "dist/bin.js",
    "dist/index.js",
    "dist/index.d.ts",
  ]) {
    assert.ok(packedPaths.has(requiredPath), `tarball is missing ${requiredPath}`);
  }
  assert.ok(
    [...packedPaths].every(
      (packedPath) =>
        packedPath === "LICENSE" ||
        packedPath === "README.md" ||
        packedPath === "THIRD_PARTY_NOTICES.md" ||
        packedPath === "package.json" ||
        packedPath.startsWith("dist/"),
    ),
    "tarball contains a file outside the documented package surface",
  );

  const tarball = path.join(packDirectory, packResult.filename);
  run("npm", ["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", tarball], {
    cwd: consumerDirectory,
  });

  const installedPackageRoot = path.join(consumerDirectory, "node_modules", "playbookdiff");
  const installedManifest = JSON.parse(
    await readFile(path.join(installedPackageRoot, "package.json"), "utf8"),
  );
  assert.equal(installedManifest.name, "playbookdiff");
  assert.equal(installedManifest.license, "MIT");
  assert.equal(installedManifest.bin?.playbookdiff, "./dist/bin.js");
  assert.equal(installedManifest.engines?.node, ">=24.11.0 <25");
  assert.equal(installedManifest.publishConfig?.access, "public");
  assert.deepEqual(installedManifest.dependencies ?? {}, {});
  assert.equal(
    Object.values(installedManifest.dependencies ?? {}).some((version) =>
      String(version).startsWith("workspace:"),
    ),
    false,
    "published runtime dependencies must not use workspace: versions",
  );

  const executable = path.join(
    consumerDirectory,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "playbookdiff.cmd" : "playbookdiff",
  );
  const help = run(executable, ["--help"], { cwd: consumerDirectory });
  assert.match(help.stdout, /USAGE/);
  const version = run(executable, ["--version"], { cwd: consumerDirectory });
  assert.equal(version.stdout.trim(), installedManifest.version);
  const check = run(executable, ["check", fixture], { cwd: consumerDirectory });
  assert.match(check.stdout, /No compatibility findings/);

  console.log(`Tarball contents: ${[...packedPaths].sort().join(", ")}`);
  console.log(
    `Verified ${packResult.filename}: ${packResult.files.length} files, zero runtime dependencies, installed CLI help, version, and parity check passed.`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
