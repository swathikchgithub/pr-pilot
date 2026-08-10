import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubApiError, GithubClient } from "./github-client";

describe("GithubClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("fetches and returns the recursive tree", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tree: [{ path: "src/index.ts", type: "blob", sha: "abc", size: 10 }], truncated: false }),
    }) as unknown as typeof fetch;

    const client = new GithubClient("test-token");
    const tree = await client.fetchTree("vercel", "next.js", "main");

    expect(tree).toHaveLength(1);
    expect(tree[0].path).toBe("src/index.ts");
  });

  it("decodes a base64 blob into UTF-8 text", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: Buffer.from("export const x = 1;").toString("base64"), encoding: "base64" }),
    }) as unknown as typeof fetch;

    const client = new GithubClient(null);
    const content = await client.fetchBlobContent("vercel", "next.js", "abc");

    expect(content).toBe("export const x = 1;");
  });

  it("throws GithubApiError on a non-retryable failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;

    const client = new GithubClient(null);
    await expect(client.fetchTree("x", "y", "main")).rejects.toBeInstanceOf(GithubApiError);
  });

  it("retries once on a 403 rate limit and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers({ "x-ratelimit-reset": String(Math.floor(Date.now() / 1000)) }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tree: [], truncated: false }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new GithubClient(null);
    const tree = await client.fetchTree("x", "y", "main");

    expect(tree).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
