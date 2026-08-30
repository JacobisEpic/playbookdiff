import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractPullRequestShas, readEventFromPath, resolveRevisions } from "./context.js";

const PR_EVENT = {
  pull_request: {
    base: { sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", ref: "main" },
    head: { sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", ref: "feature" },
  },
};

describe("extractPullRequestShas", () => {
  it("reads base/head SHAs from a pull_request event payload", () => {
    expect(extractPullRequestShas(PR_EVENT)).toEqual({
      baseSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      headSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
  });

  it("returns undefined for a non-pull_request event shape", () => {
    expect(extractPullRequestShas({ ref: "refs/heads/main", after: "deadbeef" })).toBeUndefined();
  });

  it("returns undefined for null, non-object, and malformed payloads", () => {
    expect(extractPullRequestShas(null)).toBeUndefined();
    expect(extractPullRequestShas("not an object")).toBeUndefined();
    expect(extractPullRequestShas({ pull_request: {} })).toBeUndefined();
    expect(extractPullRequestShas({ pull_request: { base: {}, head: {} } })).toBeUndefined();
    expect(
      extractPullRequestShas({ pull_request: { base: { sha: 123 }, head: { sha: "x" } } }),
    ).toBeUndefined();
  });
});

describe("readEventFromPath", () => {
  it("returns undefined when the path is undefined", async () => {
    expect(await readEventFromPath(undefined)).toBeUndefined();
  });

  it("returns undefined when the file does not exist", async () => {
    expect(await readEventFromPath("/no/such/event.json")).toBeUndefined();
  });

  it("returns undefined for malformed JSON rather than throwing", async () => {
    const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "pd-event-")), "event.json");
    await fs.writeFile(file, "{ not valid json", "utf8");
    expect(await readEventFromPath(file)).toBeUndefined();
  });

  it("parses a valid event JSON file", async () => {
    const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "pd-event-")), "event.json");
    await fs.writeFile(file, JSON.stringify(PR_EVENT), "utf8");
    expect(await readEventFromPath(file)).toEqual(PR_EVENT);
  });
});

describe("resolveRevisions", () => {
  it("uses explicit baseline/candidate inputs when both are provided", () => {
    expect(
      resolveRevisions({ explicitBaseline: "main", explicitCandidate: "HEAD", eventName: "push" }),
    ).toEqual({ baseline: "main", candidate: "HEAD" });
  });

  it("derives baseline/candidate from a pull_request event when no inputs are given", () => {
    expect(resolveRevisions({ eventName: "pull_request", event: PR_EVENT })).toEqual({
      baseline: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      candidate: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
  });

  it("an explicit baseline overrides the PR default while candidate still falls back", () => {
    expect(
      resolveRevisions({
        explicitBaseline: "custom-base",
        eventName: "pull_request",
        event: PR_EVENT,
      }),
    ).toEqual({
      baseline: "custom-base",
      candidate: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
  });

  it("an explicit candidate overrides the PR default while baseline still falls back", () => {
    expect(
      resolveRevisions({
        explicitCandidate: "custom-head",
        eventName: "pull_request",
        event: PR_EVENT,
      }),
    ).toEqual({
      baseline: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      candidate: "custom-head",
    });
  });

  it("explicit inputs work outside pull_request events too", () => {
    expect(
      resolveRevisions({
        explicitBaseline: "v1.0.0",
        explicitCandidate: "v1.1.0",
        eventName: "push",
      }),
    ).toEqual({ baseline: "v1.0.0", candidate: "v1.1.0" });
  });

  it("returns an error when neither input nor a usable pull_request event is available", () => {
    const result = resolveRevisions({ eventName: "push" });
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("baseline and candidate");
    expect((result as { error: string }).error).toContain('"push"');
  });

  it("returns an error naming only the missing side when one input is provided outside a PR", () => {
    const result = resolveRevisions({ explicitBaseline: "main", eventName: "push" });
    expect((result as { error: string }).error).toContain("candidate revision");
    expect((result as { error: string }).error).not.toContain("baseline and candidate");
  });

  it("returns an error when the event is pull_request but the payload lacks usable SHAs", () => {
    const result = resolveRevisions({ eventName: "pull_request", event: {} });
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("pull_request.base.sha");
  });

  it("never falls back to a guessed default like HEAD~1", () => {
    const result = resolveRevisions({ eventName: "workflow_dispatch" });
    expect(JSON.stringify(result)).not.toContain("HEAD~1");
  });
});
