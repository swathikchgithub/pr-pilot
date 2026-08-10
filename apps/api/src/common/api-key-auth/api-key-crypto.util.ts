import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "prp";
const PREFIX_DISPLAY_LENGTH = 12;

export interface GeneratedApiKey {
  /** The full secret shown to the user exactly once. Format: prp_<43 base64url chars>. */
  secret: string;
  /** Short, non-secret prefix persisted for display in the dashboard, e.g. "prp_a1b2c3d4". */
  displayPrefix: string;
}

export function generateApiKey(): GeneratedApiKey {
  const random = randomBytes(32).toString("base64url");
  const secret = `${KEY_PREFIX}_${random}`;
  return { secret, displayPrefix: secret.slice(0, PREFIX_DISPLAY_LENGTH) };
}

/** Keyed hash (HMAC-equivalent via salted SHA-256) so lookups are a single indexed equality check. */
export function hashApiKeySecret(secret: string, pepper: string): string {
  return createHash("sha256").update(`${pepper}:${secret}`).digest("hex");
}

export function looksLikeApiKey(token: string): boolean {
  return token.startsWith(`${KEY_PREFIX}_`);
}
