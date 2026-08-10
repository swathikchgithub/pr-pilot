import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@pr-pilot/db";
import { toVectorLiteral } from "./vector-literal.util";
import type { ExtractedChunk } from "../chunking/chunk.types";

export interface ChunkToPersist extends ExtractedChunk {
  filename: string;
  embedding: number[];
}

const INSERT_BATCH_SIZE = 50;

/** Replaces all chunks for a repo in one transaction — re-ingestion is idempotent. */
export async function persistChunks(prisma: PrismaClient, repoId: string, chunks: ChunkToPersist[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM code_chunks WHERE repo_id = ${repoId}`;

    for (let i = 0; i < chunks.length; i += INSERT_BATCH_SIZE) {
      await insertBatch(tx as unknown as PrismaClient, repoId, chunks.slice(i, i + INSERT_BATCH_SIZE));
    }
  });
}

async function insertBatch(prisma: PrismaClient, repoId: string, batch: ChunkToPersist[]): Promise<void> {
  if (batch.length === 0) return;

  const rows = batch.map(
    (c) => Prisma.sql`(
      ${randomUUID()}, ${repoId}, ${c.filename}, ${c.startLine}, ${c.endLine},
      ${c.content}, ${c.symbolKind}, ${c.symbolName}, ${toVectorLiteral(c.embedding)}::vector, now()
    )`,
  );

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO code_chunks
      (id, repo_id, filename, start_line, end_line, content, symbol_kind, symbol_name, embedding, created_at)
    VALUES ${Prisma.join(rows)}
  `);
}
