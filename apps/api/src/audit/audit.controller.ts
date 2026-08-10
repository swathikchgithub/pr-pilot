import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { ListAuditLogResponse } from "@pr-pilot/types";
import { OrgAuthGuard } from "../common/guards/org-auth.guard";
import { CurrentOrgContext } from "../common/decorators/org-context.decorator";
import type { OrgContext } from "../common/org-context";
import { AuditService } from "./audit.service";
import { ListAuditLogDto } from "./dto/list-audit-log.dto";

@Controller("v1/audit-log")
@UseGuards(OrgAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@CurrentOrgContext() ctx: OrgContext, @Query() query: ListAuditLogDto): Promise<ListAuditLogResponse> {
    return this.auditService.list(ctx.orgId, query);
  }
}
