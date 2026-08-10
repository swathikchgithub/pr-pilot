import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiKey, ApiKeyWithSecret } from "@pr-pilot/types";
import { PrismaService } from "../prisma/prisma.service";
import { generateApiKey, hashApiKeySecret } from "../common/api-key-auth/api-key-crypto.util";
import type { AppConfig } from "../config/configuration";

@Injectable()
export class ApiKeysService {
  private readonly pepper: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.pepper = config.getOrThrow<AppConfig>("app").apiKeyPepper;
  }

  async create(orgId: string, name: string): Promise<ApiKeyWithSecret> {
    const { secret, displayPrefix } = generateApiKey();
    const keyHash = hashApiKeySecret(secret, this.pepper);

    const record = await this.prisma.apiKey.create({
      data: { orgId, name, keyPrefix: displayPrefix, keyHash },
    });

    return { ...this.toDto(record), secret };
  }

  async listForOrg(orgId: string): Promise<ApiKey[]> {
    const records = await this.prisma.apiKey.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });
    return records.map((r) => this.toDto(r));
  }

  async revoke(orgId: string, apiKeyId: string): Promise<void> {
    const record = await this.prisma.apiKey.findFirst({ where: { id: apiKeyId, orgId } });
    if (!record) {
      throw new NotFoundException("API key not found");
    }
    await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { revokedAt: new Date() },
    });
  }

  private toDto(record: {
    id: string;
    orgId: string;
    name: string;
    keyPrefix: string;
    createdAt: Date;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
  }): ApiKey {
    return {
      id: record.id,
      orgId: record.orgId,
      name: record.name,
      keyPrefix: record.keyPrefix,
      createdAt: record.createdAt.toISOString(),
      lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
      revokedAt: record.revokedAt?.toISOString() ?? null,
    };
  }
}
