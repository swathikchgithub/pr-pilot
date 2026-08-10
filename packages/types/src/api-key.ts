export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/** Only returned once, at creation time — never persisted or shown again. */
export interface ApiKeyWithSecret extends ApiKey {
  secret: string;
}

export interface CreateApiKeyRequest {
  name: string;
}
