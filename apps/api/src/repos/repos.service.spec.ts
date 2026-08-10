import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ReposService } from "./repos.service";
import { PrismaService } from "../prisma/prisma.service";
import { IngestQueueService } from "./ingest-queue.service";

function buildService() {
  const prisma = {
    repo: { findUnique: jest.fn(), create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
  };
  const ingestQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const service = new ReposService(prisma as unknown as PrismaService, ingestQueue as unknown as IngestQueueService);
  return { service, prisma, ingestQueue };
}

const REPO_ROW = {
  id: "repo_1",
  orgId: "org_1",
  githubUrl: "https://github.com/vercel/next.js",
  defaultBranch: "main",
  status: "PENDING",
  chunkCount: 0,
  lastIndexedAt: null,
  lastError: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("ReposService", () => {
  describe("create", () => {
    it("rejects a non-GitHub URL before touching the database", async () => {
      const { service, prisma } = buildService();
      await expect(service.create("org_1", { githubUrl: "https://gitlab.com/x/y" })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.repo.findUnique).not.toHaveBeenCalled();
    });

    it("rejects a repo already registered for the org", async () => {
      const { service, prisma } = buildService();
      prisma.repo.findUnique.mockResolvedValue(REPO_ROW);
      await expect(
        service.create("org_1", { githubUrl: "https://github.com/vercel/next.js" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("creates the repo and enqueues an ingestion job", async () => {
      const { service, prisma, ingestQueue } = buildService();
      prisma.repo.findUnique.mockResolvedValue(null);
      prisma.repo.create.mockResolvedValue(REPO_ROW);

      const repo = await service.create("org_1", { githubUrl: "https://github.com/vercel/next.js" });

      expect(repo.status).toBe("PENDING");
      expect(ingestQueue.enqueue).toHaveBeenCalledWith({
        repoId: "repo_1",
        orgId: "org_1",
        githubUrl: "https://github.com/vercel/next.js",
        defaultBranch: "main",
      });
    });
  });

  describe("getReadyOrThrow", () => {
    it("throws NotFound when the repo doesn't belong to the org", async () => {
      const { service, prisma } = buildService();
      prisma.repo.findFirst.mockResolvedValue(null);
      await expect(service.getReadyOrThrow("org_1", "repo_1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequest when the repo isn't READY yet", async () => {
      const { service, prisma } = buildService();
      prisma.repo.findFirst.mockResolvedValue(REPO_ROW);
      await expect(service.getReadyOrThrow("org_1", "repo_1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("returns the repo when READY", async () => {
      const { service, prisma } = buildService();
      prisma.repo.findFirst.mockResolvedValue({ ...REPO_ROW, status: "READY" });
      const repo = await service.getReadyOrThrow("org_1", "repo_1");
      expect(repo.status).toBe("READY");
    });
  });
});
