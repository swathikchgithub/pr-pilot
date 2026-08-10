import { toVectorLiteral } from "./vector-literal.util";

describe("toVectorLiteral", () => {
  it("serializes a numeric array as a bracketed, comma-separated literal", () => {
    expect(toVectorLiteral([0.1, 0.2, 0.3])).toBe("[0.1,0.2,0.3]");
  });

  it("handles an empty embedding", () => {
    expect(toVectorLiteral([])).toBe("[]");
  });

  it("throws on NaN or Infinity to avoid building a malformed SQL literal", () => {
    expect(() => toVectorLiteral([0.1, NaN])).toThrow(/non-finite/);
    expect(() => toVectorLiteral([Infinity])).toThrow(/non-finite/);
  });
});
