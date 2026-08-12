import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from "@ai-sdk/google";
import { embedMany } from "ai";

// text-embedding-004 was retired by Google; gemini-embedding-001 replaces it and
// defaults to 3072 dims, so outputDimensionality is pinned to 768 to match the
// existing vector(768) column (see packages/db/prisma/schema.prisma).
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_BATCH_SIZE = 100;

export class EmbeddingClient {
  private readonly provider: GoogleGenerativeAIProvider;

  constructor(apiKey: string) {
    this.provider = createGoogleGenerativeAI({ apiKey });
  }

  /**
   * Embeds all chunk contents in fixed-size batches to stay under the
   * provider's per-request payload limits. Time: O(n) requests where
   * n = ceil(chunks / batchSize); each request is itself O(batchSize).
   */
  async embedAll(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
      const { embeddings } = await embedMany({
        model: this.provider.textEmbeddingModel(EMBEDDING_MODEL, { outputDimensionality: EMBEDDING_DIMENSIONS }),
        values: batch,
      });
      results.push(...embeddings);
    }

    return results;
  }
}
