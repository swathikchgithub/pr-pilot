import { RerankService } from "./rerank.service";
import { ConfigService } from "@nestjs/config";
import type { RetrievedChunk } from "./retrieval.types";

function buildChunks(): RetrievedChunk[] {
  return [
    { id: "a", filename: "a.ts", startLine: 1, endLine: 5, content: "function a() {}", symbolKind: "function", symbolName: "a", score: 0.5 },
    { id: "b", filename: "b.ts", startLine: 1, endLine: 5, content: "function b() {}", symbolKind: "function", symbolName: "b", score: 0.4 },
  ];
}

function buildService() {
  const config = { getOrThrow: jest.fn().mockReturnValue({ cohereApiKey: "test-key" }) };
  return new RerankService(config as unknown as ConfigService);
}

describe("RerankService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("returns an empty array unchanged", async () => {
    const service = buildService();
    await expect(service.rerank("q", [], 5)).resolves.toEqual([]);
  });

  it("reorders chunks by Cohere's relevance score", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ index: 1, relevance_score: 0.9 }, { index: 0, relevance_score: 0.3 }] }),
    }) as unknown as typeof fetch;
    const service = buildService();

    const result = await service.rerank("query", buildChunks(), 2);

    expect(result[0].id).toBe("b");
    expect(result[0].score).toBe(0.9);
    expect(result[1].id).toBe("a");
  });

  it("falls back to the original order when Cohere errors", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    const service = buildService();
    const chunks = buildChunks();

    const result = await service.rerank("query", chunks, 2);

    expect(result).toEqual(chunks);
  });
});
