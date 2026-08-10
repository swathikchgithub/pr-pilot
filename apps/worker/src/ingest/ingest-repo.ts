import type { PrismaClient } from "@pr-pilot/db";
import type { IngestJobPayload } from "@pr-pilot/types";
import { GithubClient } from "../github/github-client";
import { parseGithubUrl } from "../github/github-url.util";
import { isIngestableFile } from "../github/file-filters";
import { chunkFile } from "../chunking/structural-chunker";
import type { ExtractedChunk } from "../chunking/chunk.types";
import { EmbeddingClient } from "../embedding/embed-chunks";
import { persistChunks } from "./persist-chunks";
import type { Logger } from "../logger";

type PendingChunk = ExtractedChunk & { filename: string };

export interface IngestDependencies {
  prisma: PrismaClient;
  github: GithubClient;
  embeddingClient: EmbeddingClient;
  logger: Logger;
}

const MAX_ERROR_MESSAGE_LENGTH = 500;

export async function ingestRepo(payload: IngestJobPayload, deps: IngestDependencies): Promise<void> {
  const { prisma, github, embeddingClient, logger } = deps;
  const parsed = parseGithubUrl(payload.githubUrl);
  if (!parsed) {
    await markFailed(prisma, payload.repoId, "githubUrl is not a valid https://github.com/<owner>/<repo> URL");
    return;
  }

  await prisma.repo.update({ where: { id: payload.repoId }, data: { status: "INDEXING", lastError: null } });
  logger.info(`Indexing ${payload.githubUrl}#${payload.defaultBranch}`, { repoId: payload.repoId });

  try {
    const tree = await github.fetchTree(parsed.owner, parsed.repo, payload.defaultBranch);
    const files = tree.filter(isIngestableFile);
    logger.info(`Found ${files.length} ingestable files`, { repoId: payload.repoId });

    const chunks: PendingChunk[] = [];
    for (const file of files) {
      const content = await github.fetchBlobContent(parsed.owner, parsed.repo, file.sha);
      for (const extracted of chunkFile(file.path, content)) {
        chunks.push({ ...extracted, filename: file.path });
      }
    }

    const embeddings = await embeddingClient.embedAll(chunks.map((c) => c.content));
    const chunksWithEmbeddings = chunks.map((chunk, i) => ({ ...chunk, embedding: embeddings[i] }));

    await persistChunks(prisma, payload.repoId, chunksWithEmbeddings);

    await prisma.repo.update({
      where: { id: payload.repoId },
      data: { status: "READY", chunkCount: chunks.length, lastIndexedAt: new Date(), lastError: null },
    });
    logger.info(`Indexed ${chunks.length} chunks`, { repoId: payload.repoId });
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, MAX_ERROR_MESSAGE_LENGTH);
    await markFailed(prisma, payload.repoId, message);
    throw error;
  }
}

async function markFailed(prisma: PrismaClient, repoId: string, message: string): Promise<void> {
  await prisma.repo.update({ where: { id: repoId }, data: { status: "FAILED", lastError: message } });
}
