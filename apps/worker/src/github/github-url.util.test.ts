import { describe, expect, it } from "vitest";
import { parseGithubUrl } from "./github-url.util";

describe("parseGithubUrl", () => {
  it("parses owner and repo from a github.com URL", () => {
    expect(parseGithubUrl("https://github.com/vercel/next.js")).toEqual({ owner: "vercel", repo: "next.js" });
  });

  it("returns null for a non-GitHub host", () => {
    expect(parseGithubUrl("https://gitlab.com/vercel/next.js")).toBeNull();
  });
});
