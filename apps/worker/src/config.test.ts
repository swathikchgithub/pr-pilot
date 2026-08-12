import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config";

const REQUIRED_KEYS = ["DATABASE_URL", "REDIS_URL", "GOOGLE_GENERATIVE_AI_API_KEY"];

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
    process.env.REDIS_URL = "redis://host:6379";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "gemini-key";
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("loads all required variables when present", () => {
    expect(loadConfig()).toEqual({
      databaseUrl: "postgresql://user:pass@host:5432/db",
      redisUrl: "redis://host:6379",
      googleApiKey: "gemini-key",
      githubToken: null,
    });
  });

  it("defaults githubToken to null when unset", () => {
    expect(loadConfig().githubToken).toBeNull();
  });

  it("passes through GITHUB_TOKEN when set", () => {
    process.env.GITHUB_TOKEN = "ghp_test";
    expect(loadConfig().githubToken).toBe("ghp_test");
  });

  it.each(REQUIRED_KEYS)("throws when %s is missing", (key) => {
    delete process.env[key];
    expect(() => loadConfig()).toThrow(`Missing required environment variable: ${key}`);
  });
});
