import { describe, expect, it } from "vitest";
import { chunkFile } from "./structural-chunker";

describe("chunkFile", () => {
  it("extracts a top-level TS function and an arrow-function const as separate chunks", () => {
    const content = [
      "export function add(a: number, b: number) {",
      "  return a + b;",
      "}",
      "",
      "export const subtract = (a: number, b: number) => {",
      "  return a - b;",
      "};",
    ].join("\n");

    const chunks = chunkFile("math.ts", content);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({ symbolKind: "function", symbolName: "add", startLine: 1, endLine: 3 });
    expect(chunks[1]).toMatchObject({ symbolKind: "function", symbolName: "subtract", startLine: 5 });
  });

  it("extracts a class and its unmodified + modified methods without conflating them into one block", () => {
    const content = [
      "export class AuthService {",
      "  private secret: string;",
      "",
      "  constructor(secret: string) {",
      "    this.secret = secret;",
      "  }",
      "",
      "  login(username: string) {",
      "    return this.verify(username);",
      "  }",
      "}",
    ].join("\n");

    const chunks = chunkFile("auth.ts", content);

    expect(chunks).toEqual([
      expect.objectContaining({ symbolKind: "class", symbolName: "AuthService", startLine: 1, endLine: 11 }),
      expect.objectContaining({ symbolKind: "method", symbolName: "constructor", startLine: 4, endLine: 6 }),
      expect.objectContaining({ symbolKind: "method", symbolName: "login", startLine: 8, endLine: 10 }),
    ]);
  });

  it("does not misinterpret if/for/while control blocks as methods", () => {
    const content = [
      "function process(items) {",
      "  if (items.length > 0) {",
      "    for (const item of items) {",
      "      console.log(item);",
      "    }",
      "  }",
      "}",
    ].join("\n");

    const chunks = chunkFile("process.ts", content);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].symbolName).toBe("process");
    expect(chunks[0].endLine).toBe(7);
  });

  it("ignores a top-level if-guard instead of treating it as a method definition", () => {
    const content = [
      "if (typeof window !== 'undefined') {",
      "  window.foo = 1;",
      "}",
      "",
      "function real() {",
      "  return 1;",
      "}",
    ].join("\n");

    const chunks = chunkFile("guard.ts", content);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].symbolName).toBe("real");
  });

  it("extracts a Go function", () => {
    const content = ["func Add(a int, b int) int {", "\treturn a + b", "}"].join("\n");
    const chunks = chunkFile("main.go", content);
    expect(chunks).toEqual([
      expect.objectContaining({ symbolKind: "function", symbolName: "Add", startLine: 1, endLine: 3 }),
    ]);
  });

  it("extracts Python functions and classes using indentation, not braces", () => {
    const content = [
      "class Greeter:",
      "    def __init__(self, name):",
      "        self.name = name",
      "",
      "    def greet(self):",
      "        return f'Hello {self.name}'",
      "",
      "def standalone():",
      "    return 42",
    ].join("\n");

    const chunks = chunkFile("greeter.py", content);

    expect(chunks[0]).toMatchObject({ symbolKind: "class", symbolName: "Greeter", startLine: 1, endLine: 6 });
    expect(chunks[1]).toMatchObject({ symbolKind: "function", symbolName: "standalone", startLine: 8, endLine: 9 });
  });

  it("falls back to fixed-size windows for files with no detected symbols", () => {
    const lines = Array.from({ length: 130 }, (_, i) => `key_${i}: value_${i}`);
    const chunks = chunkFile("config.yaml", lines.join("\n"));

    expect(chunks.every((c) => c.symbolKind === "window")).toBe(true);
    expect(chunks[0]).toMatchObject({ startLine: 1, endLine: 60 });
    expect(chunks[1]).toMatchObject({ startLine: 51, endLine: 110 });
  });

  it("returns no chunks for an empty file", () => {
    expect(chunkFile("empty.ts", "")).toEqual([]);
  });
});
