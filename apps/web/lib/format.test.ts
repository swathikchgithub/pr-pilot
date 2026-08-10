import { describe, expect, it } from "vitest";
import { truncate } from "./format";

describe("truncate", () => {
  it("returns the text unchanged when under the limit", () => {
    expect(truncate("short text")).toBe("short text");
  });

  it("truncates and appends an ellipsis when over the limit", () => {
    const text = "a".repeat(100);
    const result = truncate(text, 10);
    expect(result).toBe(`${"a".repeat(10)}…`);
  });

  it("respects a custom max length", () => {
    expect(truncate("hello world", 5)).toBe("hello…");
  });
});
