import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "../config/configuration";
import type { RetrievedChunk } from "./retrieval.types";

const COHERE_RERANK_URL = "https://api.cohere.com/v2/rerank";
const RERANK_MODEL = "rerank-v3.5";

interface CohereRerankResult {
  index: number;
  relevance_score: number;
}

interface CohereRerankResponse {
  results: CohereRerankResult[];
}

@Injectable()
export class RerankService {
  private readonly logger = new Logger(RerankService.name);
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow<AppConfig>("app").cohereApiKey;
  }

  /**
   * Cross-encoder reranking for retrieval precision. Falls back to the
   * original hybrid-search ordering if Cohere is unavailable — reranking is
   * a quality improvement, not a hard dependency for answering.
   */
  async rerank(query: string, chunks: RetrievedChunk[], topN: number): Promise<RetrievedChunk[]> {
    if (chunks.length === 0) return chunks;

    try {
      const response = await fetch(COHERE_RERANK_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: RERANK_MODEL,
          query,
          documents: chunks.map((c) => c.content),
          top_n: Math.min(topN, chunks.length),
        }),
      });

      if (!response.ok) {
        throw new Error(`Cohere rerank returned ${response.status}`);
      }

      const body = (await response.json()) as CohereRerankResponse;
      return body.results.map((result) => ({ ...chunks[result.index], score: result.relevance_score }));
    } catch (error) {
      this.logger.warn(`Reranking failed, falling back to hybrid-search order: ${(error as Error).message}`);
      return chunks.slice(0, topN);
    }
  }
}
