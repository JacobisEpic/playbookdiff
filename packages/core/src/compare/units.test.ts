import { describe, expect, it } from "vitest";
import { contentUnitSet, instructionContentUnits, uncoveredUnitCount } from "./units.js";

describe("instruction content units", () => {
  it("splits blank-line separated blocks and drops blank-only blocks", () => {
    expect(instructionContentUnits("# Title\n\nFirst rule.\n\n\nSecond rule.\n")).toEqual([
      "# Title",
      "First rule.",
      "Second rule.",
    ]);
  });

  it("keeps a fenced code block atomic, including its blank lines", () => {
    const content = "Build it:\n\n```sh\ncmake -B build .\n\ncmake --build build\n```\n\nDone.\n";
    expect(instructionContentUnits(content)).toEqual([
      "Build it:",
      "```sh\ncmake -B build .\n\ncmake --build build\n```",
      "Done.",
    ]);
  });

  it("does not treat the opening fence as its own closing fence", () => {
    expect(instructionContentUnits("```\nonly line\n```\n")).toEqual(["```\nonly line\n```"]);
  });

  it("supports tilde fences and longer closing markers", () => {
    expect(instructionContentUnits("~~~\ncode\n~~~\n")).toEqual(["~~~\ncode\n~~~"]);
    expect(instructionContentUnits("````\na ``` b\n````\n")).toEqual(["````\na ``` b\n````"]);
  });

  it("normalizes CRLF before splitting", () => {
    expect(instructionContentUnits("One\r\n\r\nTwo\r\n")).toEqual(["One", "Two"]);
  });

  it("returns no units for blank content", () => {
    expect(instructionContentUnits("\n\n   \n")).toEqual([]);
  });

  it("counts only units absent from the available set", () => {
    const available = contentUnitSet(["Shared rule.\n\nOther rule.\n"]);
    expect(uncoveredUnitCount("Shared rule.\n\nNew rule.\n", available)).toBe(1);
    expect(uncoveredUnitCount("Shared rule.\n", available)).toBe(0);
  });

  it("treats a repeated unit as covered by a single occurrence", () => {
    const available = contentUnitSet(["Rule.\n"]);
    expect(uncoveredUnitCount("Rule.\n\nRule.\n", available)).toBe(0);
  });
});
