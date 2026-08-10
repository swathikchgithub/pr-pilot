import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from "@ai-sdk/google";
import { embed } from "ai";
import type { AppConfig } from "../config/configuration";

const EMBEDDING_MODEL = "text-embedding-004";
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
      model: this.provider.textEmbeddingModel(EMBEDDING_MODEL),
      value: text,
    });
    return embedding;
  }
}
