import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from "@ai-sdk/google";
import { embed } from "ai";
import type { AppConfig } from "../config/configuration";

// text-embedding-004 was retired by Google; gemini-embedding-001 replaces it and
// defaults to 3072 dims, so outputDimensionality is pinned to 768 to match the
// existing vector(768) column (see packages/db/prisma/schema.prisma).
const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

@Injectable()
export class EmbeddingService {
  private readonly provider: GoogleGenerativeAIProvider;

  constructor(config: ConfigService) {
    const app = config.getOrThrow<AppConfig>("app");
    this.provider = createGoogleGenerativeAI({ apiKey: app.googleApiKey });
  }

  async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.provider.textEmbeddingModel(EMBEDDING_MODEL, { outputDimensionality: EMBEDDING_DIMENSIONS }),
      value: text,
    });
    return embedding;
  }
}
