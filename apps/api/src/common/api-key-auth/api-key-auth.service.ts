import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { hashApiKeySecret } from "./api-key-crypto.util";
import type { AppConfig } from "../../config/configuration";

export interface ApiKeyPrincipal {
  orgId: string;
  apiKeyId: string;
}

@Injectable()
export class ApiKeyAuthService {
  private readonly pepper: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.pepper = config.getOrThrow<AppConfig>("app").apiKeyPepper;
  }

  /** Validates a raw `prp_...` secret and records usage. Throws if invalid or revoked. */
  async validate(secret: string): Promise<ApiKeyPrincipal> {
    const keyHash = hashApiKeySecret(secret, this.pepper);
    const apiKey = await this.prisma.apiKey.findUnique({ where: { keyHash } });

    if (!apiKey || apiKey.revokedAt) {
      throw new UnauthorizedException("Invalid or revoked API key");
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return { orgId: apiKey.orgId, apiKeyId: apiKey.id };
  }
}
