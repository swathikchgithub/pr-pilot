import { extractCitedChunks } from "./generation.service";
import type { RetrievedChunk } from "./retrieval.types";

function buildChunks(): RetrievedChunk[] {
  return [
    { id: "a", filename: "src/auth.ts", startLine: 10, endLine: 20, content: "", symbolKind: "function", symbolName: "login", score: 0.9 },
    { id: "b", filename: "src/db.ts", startLine: 1, endLine: 8, content: "", symbolKind: "function", symbolName: "connect", score: 0.7 },
  ];
}

describe("extractCitedChunks", () => {
  it("maps citation markers in the answer back to their chunks", () => {
    const answer = "Login checks the session in [src/auth.ts:10-20] before calling the DB.";
    const citations = extractCitedChunks(answer, buildChunks());

    expect(citations).toEqual([{ chunkId: "a", filename: "src/auth.ts", startLine: 10, endLine: 20, score: 0.9 }]);
  });

  it("dedupes repeated citations of the same chunk", () => {
    const answer = "[src/auth.ts:10-20] ... and again [src/auth.ts:10-20]";
    expect(extractCitedChunks(answer, buildChunks())).toHaveLength(1);
  });

  it("ignores markers that don't match any retrieved chunk", () => {
    const answer = "See [unknown/file.ts:1-2]";
    expect(extractCitedChunks(answer, buildChunks())).toEqual(
      buildChunks().map((c) => ({ chunkId: c.id, filename: c.filename, startLine: c.startLine, endLine: c.endLine, score: c.score })),
    );
  });

  it("falls back to all retrieved chunks when the model cites nothing", () => {
    const answer = "This code handles authentication and database connections.";
    const citations = extractCitedChunks(answer, buildChunks());
    expect(citations).toHaveLength(2);
  });
});
