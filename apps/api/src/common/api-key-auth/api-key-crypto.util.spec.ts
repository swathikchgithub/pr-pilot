import { generateApiKey, hashApiKeySecret, looksLikeApiKey } from "./api-key-crypto.util";

describe("api-key-crypto.util", () => {
  it("generates a secret with the prp_ prefix and a matching display prefix", () => {
    const { secret, displayPrefix } = generateApiKey();
    expect(secret.startsWith("prp_")).toBe(true);
    expect(secret.startsWith(displayPrefix)).toBe(true);
    expect(displayPrefix.length).toBe(12);
  });

  it("generates unique secrets on each call", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.secret).not.toBe(b.secret);
  });

  it("hashes deterministically for the same secret and pepper", () => {
    const hash1 = hashApiKeySecret("prp_abc", "pepper-1");
    const hash2 = hashApiKeySecret("prp_abc", "pepper-1");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different peppers", () => {
    const hash1 = hashApiKeySecret("prp_abc", "pepper-1");
    const hash2 = hashApiKeySecret("prp_abc", "pepper-2");
    expect(hash1).not.toBe(hash2);
  });

  it("identifies tokens that look like API keys", () => {
    expect(looksLikeApiKey("prp_abc123")).toBe(true);
    expect(looksLikeApiKey("eyJhbGciOi.jwt.token")).toBe(false);
  });
});
