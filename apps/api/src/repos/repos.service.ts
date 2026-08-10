import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Repo } from "@pr-pilot/types";
import { PrismaService } from "../prisma/prisma.service";
import { parseGithubUrl } from "./github-url.util";
import { IngestQueueService } from "./ingest-queue.service";
import type { CreateRepoDto } from "./dto/create-repo.dto";

const DEFAULT_BRANCH = "main";

@Injectable()
export class ReposService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestQueue: IngestQueueService,
  ) {}

  async create(orgId: string, dto: CreateRepoDto): Promise<Repo> {
    if (!parseGithubUrl(dto.githubUrl)) {
      throw new BadRequestException("githubUrl must be a valid https://github.com/<owner>/<repo> URL");
    }

    const existing = await this.prisma.repo.findUnique({
      where: { orgId_githubUrl: { orgId, githubUrl: dto.githubUrl } },
    });
    if (existing) {
      throw new ConflictException("This repository is already registered for your organization");
    }

    const repo = await this.prisma.repo.create({
      data: { orgId, githubUrl: dto.githubUrl, defaultBranch: dto.defaultBranch ?? DEFAULT_BRANCH },
    });

    await this.ingestQueue.enqueue({
      repoId: repo.id,
      orgId,
      githubUrl: repo.githubUrl,
      defaultBranch: repo.defaultBranch,
    });

    return this.toDto(repo);
  }

  async listForOrg(orgId: string): Promise<Repo[]> {
    const repos = await this.prisma.repo.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } });
    return repos.map((r) => this.toDto(r));
  }

  async getById(orgId: string, repoId: string): Promise<Repo> {
    const repo = await this.prisma.repo.findFirst({ where: { id: repoId, orgId } });
    if (!repo) {
      throw new NotFoundException("Repository not found");
    }
    return this.toDto(repo);
  }

  /** Used by QueryService/ImpactService — fails fast if the repo isn't ingested and owned by the caller's org. */
  async getReadyOrThrow(orgId: string, repoId: string): Promise<Repo> {
    const repo = await this.getById(orgId, repoId);
    if (repo.status !== "READY") {
      throw new BadRequestException(`Repository is not ready for queries (status: ${repo.status})`);
    }
    return repo;
  }

  private toDto(repo: {
    id: string;
    orgId: string;
    githubUrl: string;
    defaultBranch: string;
    status: string;
    chunkCount: number;
    lastIndexedAt: Date | null;
    lastError: string | null;
    createdAt: Date;
  }): Repo {
    return {
      id: repo.id,
      orgId: repo.orgId,
      githubUrl: repo.githubUrl,
      defaultBranch: repo.defaultBranch,
      status: repo.status as Repo["status"],
      chunkCount: repo.chunkCount,
      lastIndexedAt: repo.lastIndexedAt?.toISOString() ?? null,
      lastError: repo.lastError,
      createdAt: repo.createdAt.toISOString(),
    };
  }
}
