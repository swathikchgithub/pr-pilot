import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from "@ai-sdk/google";
import { embedMany } from "ai";

const EMBEDDING_MODEL = "text-embedding-004";
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
        model: this.provider.textEmbeddingModel(EMBEDDING_MODEL),
        values: batch,
      });
      results.push(...embeddings);
    }

    return results;
  }
}
