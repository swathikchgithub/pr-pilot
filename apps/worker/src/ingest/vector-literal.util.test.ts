import { describe, expect, it } from "vitest";
import { toVectorLiteral } from "./vector-literal.util";

describe("toVectorLiteral", () => {
  it("serializes a numeric array as a pgvector literal", () => {
    expect(toVectorLiteral([0.1, 0.2])).toBe("[0.1,0.2]");
  });

  it("throws on non-finite values", () => {
    expect(() => toVectorLiteral([NaN])).toThrow(/non-finite/);
  });
});
