import { describe, expect, it } from "vitest";
import { isIngestableFile } from "./file-filters";

describe("isIngestableFile", () => {
  it("accepts a TypeScript source file", () => {
    expect(isIngestableFile({ path: "src/index.ts", type: "blob", sha: "abc", size: 1000 })).toBe(true);
  });

  it("rejects directories", () => {
    expect(isIngestableFile({ path: "src", type: "tree", sha: "abc" })).toBe(false);
  });

  it("rejects files without a recognized code extension", () => {
    expect(isIngestableFile({ path: "README.md", type: "blob", sha: "abc", size: 100 })).toBe(false);
  });

  it("rejects files inside excluded vendor directories", () => {
    expect(isIngestableFile({ path: "node_modules/lodash/index.js", type: "blob", sha: "abc", size: 100 })).toBe(false);
  });

  it("rejects files over the size limit", () => {
    expect(isIngestableFile({ path: "src/big.ts", type: "blob", sha: "abc", size: 10_000_000 })).toBe(false);
  });
});
