/** Serializes an embedding as a pgvector text literal, e.g. "[0.1,0.2,0.3]". */
export function toVectorLiteral(embedding: number[]): string {
  if (embedding.some((n) => !Number.isFinite(n))) {
    throw new Error("Embedding contains non-finite values");
  }
  return `[${embedding.join(",")}]`;
}
