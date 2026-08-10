import { ConfigService } from "@nestjs/config";
import { generateObject } from "ai";
import { ImpactGenerationService } from "./impact-generation.service";
import type { RetrievedChunk } from "../retrieval/retrieval.types";

jest.mock("ai", () => ({ generateObject: jest.fn() }));
jest.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => (modelName: string) => ({ modelName }),
}));

const mockedGenerateObject = generateObject as jest.Mock;

function buildService() {
  const config = { getOrThrow: jest.fn().mockReturnValue({ googleApiKey: "test-key" }) };
  return new ImpactGenerationService(config as unknown as ConfigService);
}

function buildCandidates(): RetrievedChunk[] {
  return [
    { id: "c1", filename: "src/db.ts", startLine: 1, endLine: 10, content: "connect()", symbolKind: "function", symbolName: "connect", score: 0.8 },
  ];
}

describe("ImpactGenerationService", () => {
  afterEach(() => jest.clearAllMocks());

  it("resolves model-reported affected chunks back to their candidate IDs and scores", async () => {
    mockedGenerateObject.mockResolvedValue({
      object: {
        summary: "Changes to auth touch the DB connection path.",
        riskLevel: "medium",
        affectedChunks: [{ filename: "src/db.ts", startLine: 1, endLine: 10, reason: "calls connect() on login" }],
        suggestedTests: ["auth.integration.test.ts"],
      },
    });
    const service = buildService();

    const result = await service.analyze("diff text", ["src/auth.ts"], buildCandidates());

    expect(result.affectedChunks).toEqual([
      { chunkId: "c1", filename: "src/db.ts", startLine: 1, endLine: 10, reason: "calls connect() on login", relatedness: 0.8 },
    ]);
    expect(result.riskLevel).toBe("medium");
  });

  it("drops model-hallucinated chunks that don't match any candidate", async () => {
    mockedGenerateObject.mockResolvedValue({
      object: {
        summary: "s",
        riskLevel: "low",
        affectedChunks: [{ filename: "made/up.ts", startLine: 1, endLine: 2, reason: "hallucinated" }],
        suggestedTests: [],
      },
    });
    const service = buildService();

    const result = await service.analyze("diff", [], buildCandidates());

    expect(result.affectedChunks).toEqual([]);
  });
});
