import "reflect-metadata";
import { validateEnv } from "./env.validation";

function validConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    NODE_ENV: "production",
    PORT: "4000",
    DATABASE_URL: "postgresql://user:pass@host:5432/db",
    REDIS_URL: "redis://host:6379",
    JWT_SECRET: "a".repeat(32),
    API_KEY_PEPPER: "b".repeat(32),
    CORS_ORIGIN: "https://example.com",
    GOOGLE_GENERATIVE_AI_API_KEY: "gemini-key",
    COHERE_API_KEY: "cohere-key",
    ...overrides,
  };
}

describe("validateEnv", () => {
  it("accepts a fully populated, valid config", () => {
    expect(() => validateEnv(validConfig())).not.toThrow();
  });

  it("coerces a numeric-string PORT to a number", () => {
    const result = validateEnv(validConfig({ PORT: "4000" }));
    expect(result.PORT).toBe(4000);
    expect(typeof result.PORT).toBe("number");
  });

  it("defaults PORT to the number 4000 when omitted", () => {
    const { PORT: _omit, ...rest } = validConfig();
    const result = validateEnv(rest);
    expect(result.PORT).toBe(4000);
    expect(typeof result.PORT).toBe("number");
  });

  it("defaults NODE_ENV to development when omitted", () => {
    const { NODE_ENV: _omit, ...rest } = validConfig();
    const result = validateEnv(rest);
    expect(result.NODE_ENV).toBe("development");
  });

  it("rejects a NODE_ENV outside development/production/test", () => {
    expect(() => validateEnv(validConfig({ NODE_ENV: "staging" }))).toThrow(/NODE_ENV/);
  });

  it("rejects a missing required DATABASE_URL", () => {
    const { DATABASE_URL: _omit, ...rest } = validConfig();
    expect(() => validateEnv(rest)).toThrow();
  });

  it("rejects a JWT_SECRET shorter than 32 characters", () => {
    expect(() => validateEnv(validConfig({ JWT_SECRET: "too-short" }))).toThrow(/JWT_SECRET/);
  });

  it("rejects an API_KEY_PEPPER shorter than 32 characters", () => {
    expect(() => validateEnv(validConfig({ API_KEY_PEPPER: "too-short" }))).toThrow(/API_KEY_PEPPER/);
  });
});
