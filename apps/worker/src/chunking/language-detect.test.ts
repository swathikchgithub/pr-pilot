import { describe, expect, it } from "vitest";
import { detectLanguageFamily } from "./language-detect";

describe("detectLanguageFamily", () => {
  it("classifies TypeScript and Go as brace languages", () => {
    expect(detectLanguageFamily("index.ts")).toBe("brace");
    expect(detectLanguageFamily("main.go")).toBe("brace");
  });

  it("classifies Python separately", () => {
    expect(detectLanguageFamily("app.py")).toBe("python");
  });

  it("falls back to unknown for unrecognized extensions", () => {
    expect(detectLanguageFamily("data.yaml")).toBe("unknown");
  });
});
