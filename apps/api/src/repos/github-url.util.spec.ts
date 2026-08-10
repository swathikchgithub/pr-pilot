import { parseGithubUrl } from "./github-url.util";

describe("parseGithubUrl", () => {
  it("parses a plain github.com URL", () => {
    expect(parseGithubUrl("https://github.com/vercel/next.js")).toEqual({ owner: "vercel", repo: "next.js" });
  });

  it("strips a trailing .git suffix", () => {
    expect(parseGithubUrl("https://github.com/vercel/next.js.git")).toEqual({ owner: "vercel", repo: "next.js" });
  });

  it("strips a trailing slash", () => {
    expect(parseGithubUrl("https://github.com/vercel/next.js/")).toEqual({ owner: "vercel", repo: "next.js" });
  });

  it("rejects non-GitHub URLs", () => {
    expect(parseGithubUrl("https://gitlab.com/vercel/next.js")).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(parseGithubUrl("not a url")).toBeNull();
    expect(parseGithubUrl("https://github.com/just-an-owner")).toBeNull();
  });
});
