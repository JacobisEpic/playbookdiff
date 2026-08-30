import { describe, expect, it } from "vitest";
import { canonicalizeScopePath, canonicalizeScopePaths } from "./scope.js";

describe("canonical scope coordinate system", () => {
  it("treats the repository root spellings as one canonical value", () => {
    for (const value of [".", "./", "", "./.", ".//"]) {
      expect(canonicalizeScopePath(value)).toBe(".");
    }
  });

  it("normalizes redundant separators and dot segments in a nested path", () => {
    for (const value of ["server", "./server", "server/", "./server/", "server/.", ".//server//"]) {
      expect(canonicalizeScopePath(value)).toBe("server");
    }
  });

  it("normalizes Windows separators to POSIX", () => {
    expect(canonicalizeScopePath("apps\\api")).toBe("apps/api");
  });

  it("preserves glob syntax used by path-scoped rules", () => {
    expect(canonicalizeScopePath("src/**/*.ts")).toBe("src/**/*.ts");
    expect(canonicalizeScopePath("./src/**/*.{ts,tsx}")).toBe("src/**/*.{ts,tsx}");
    expect(canonicalizeScopePath("**/*.md")).toBe("**/*.md");
  });

  it("never resolves .. into a different location", () => {
    expect(canonicalizeScopePath("../sibling")).toBe("../sibling");
    expect(canonicalizeScopePath("apps/../api")).toBe("apps/../api");
  });

  it("de-duplicates and sorts a set of entries", () => {
    expect(canonicalizeScopePaths(["./server/", "server", "apps/api", "."])).toEqual([
      ".",
      "apps/api",
      "server",
    ]);
    expect(canonicalizeScopePaths(undefined)).toEqual([]);
  });
});
