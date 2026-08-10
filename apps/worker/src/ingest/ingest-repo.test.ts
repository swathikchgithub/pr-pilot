import { beforeEach, describe, expect, it, vi } from "vitest";
import { ingestRepo } from "./ingest-repo";
import type { GithubClient } from "../github/github-client";
import type { EmbeddingClient } from "../embedding/embed-chunks";
import type { Logger } from "../logger";
import type { IngestJobPayload } from "@pr-pilot/types";

vi.mock("./persist-chunks", () => ({ persistChunks: vi.fn().mockResolvedValue(undefined) }));

const PAYLOAD: IngestJobPayload = {
  repoId: "repo_1",
  orgId: "org_1",
  githubUrl: "https://github.com/vercel/next.js",
  defaultBranch: "main",
};

function buildDeps() {
  const prisma = { repo: { update: vi.fn().mockResolvedValue(undefined) } };
  const github = {
    fetchTree: vi.fn().mockResolvedValue([{ path: "src/index.ts", type: "blob", sha: "sha1", size: 100 }]),
    fetchBlobContent: vi.fn().mockResolvedValue("export function main() {\n  return 1;\n}"),
  };
  const embeddingClient = { embedAll: vi.fn().mockResolvedValue([[0.1, 0.2]]) };
  const logger: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  return {
    prisma: prisma as unknown as import("@pr-pilot/db").PrismaClient,
    github: github as unknown as GithubClient,
    embeddingClient: embeddingClient as unknown as EmbeddingClient,
    logger,
    mocks: { prisma, github, embeddingClient },
  };
}

describe("ingestRepo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks the repo FAILED immediately for a malformed githubUrl, without hitting GitHub", async () => {
    const deps = buildDeps();
    await ingestRepo({ ...PAYLOAD, githubUrl: "https://gitlab.com/x/y" }, deps);

    expect(deps.mocks.prisma.repo.update).toHaveBeenCalledWith({
      where: { id: "repo_1" },
      data: { status: "FAILED", lastError: expect.stringContaining("githubUrl") },
    });
    expect(deps.mocks.github.fetchTree).not.toHaveBeenCalled();
  });

  it("transitions INDEXING -> READY and records the chunk count on success", async () => {
    const deps = buildDeps();
    await ingestRepo(PAYLOAD, deps);

    expect(deps.mocks.prisma.repo.update).toHaveBeenNthCalledWith(1, {
      where: { id: "repo_1" },
      data: { status: "INDEXING", lastError: null },
    });
    const finalCall = deps.mocks.prisma.repo.update.mock.calls.at(-1)[0];
    expect(finalCall.data.status).toBe("READY");
    expect(finalCall.data.chunkCount).toBeGreaterThan(0);
  });

  it("marks the repo FAILED and rethrows when the GitHub fetch throws", async () => {
    const deps = buildDeps();
    deps.mocks.github.fetchTree.mockRejectedValue(new Error("rate limited"));

    await expect(ingestRepo(PAYLOAD, deps)).rejects.toThrow("rate limited");

    const finalCall = deps.mocks.prisma.repo.update.mock.calls.at(-1)[0];
    expect(finalCall.data).toEqual({ status: "FAILED", lastError: "rate limited" });
  });
});
