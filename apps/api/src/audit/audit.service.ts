import { Injectable } from "@nestjs/common";
import type { AuditEventType, AuditLogEntry, Citation, ListAuditLogParams, ListAuditLogResponse } from "@pr-pilot/types";
import { PrismaService } from "../prisma/prisma.service";
import type { OrgContext } from "../common/org-context";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface RecordAuditEventInput {
  orgId: string;
  repoId: string;
  ctx: OrgContext;
  eventType: AuditEventType;
  input: string;
  output: string;
  citations: Citation[];
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: RecordAuditEventInput): Promise<string> {
    const entry = await this.prisma.auditLogEntry.create({
      data: {
        orgId: event.orgId,
        repoId: event.repoId,
        apiKeyId: event.ctx.apiKeyId,
        userId: event.ctx.userId,
        eventType: event.eventType,
        input: event.input,
        output: event.output,
        citations: event.citations as unknown as object,
      },
    });
    return entry.id;
  }

  async list(orgId: string, params: ListAuditLogParams): Promise<ListAuditLogResponse> {
    const limit = Math.min(params.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const entries = await this.prisma.auditLogEntry.findMany({
      where: {
        orgId,
        repoId: params.repoId,
        eventType: params.eventType,
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });

    const hasMore = entries.length > limit;
    const page = hasMore ? entries.slice(0, limit) : entries;

    return {
      items: page.map((e) => ({
        id: e.id,
        orgId: e.orgId,
        repoId: e.repoId,
        apiKeyId: e.apiKeyId,
        userId: e.userId,
        eventType: e.eventType,
        input: e.input,
        output: e.output,
        citations: e.citations as unknown as Citation[],
        createdAt: e.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }
}
