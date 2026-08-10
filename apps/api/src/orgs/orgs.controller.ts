import { Controller, Get, UseGuards } from "@nestjs/common";
import type { Organization } from "@pr-pilot/types";
import { OrgAuthGuard } from "../common/guards/org-auth.guard";
import { CurrentOrgContext } from "../common/decorators/org-context.decorator";
import type { OrgContext } from "../common/org-context";
import { OrgsService } from "./orgs.service";

@Controller("v1/orgs")
@UseGuards(OrgAuthGuard)
export class OrgsController {
  constructor(private readonly orgsService: OrgsService) {}

  @Get("current")
  getCurrent(@CurrentOrgContext() ctx: OrgContext): Promise<Organization> {
    return this.orgsService.getById(ctx.orgId);
  }
}
