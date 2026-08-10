import { Injectable, NotFoundException } from "@nestjs/common";
import type { Organization } from "@pr-pilot/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrgsService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(orgId: string): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException("Organization not found");
    }
    return { id: org.id, name: org.name, slug: org.slug, createdAt: org.createdAt.toISOString() };
  }
}
