import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import type { ApiKey, ApiKeyWithSecret } from "@pr-pilot/types";
import { OrgAuthGuard } from "../common/guards/org-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentOrgContext } from "../common/decorators/org-context.decorator";
import type { OrgContext } from "../common/org-context";
import { ApiKeysService } from "./api-keys.service";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";

@Controller("v1/api-keys")
@UseGuards(OrgAuthGuard, RolesGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @Roles("OWNER", "ADMIN")
  create(@CurrentOrgContext() ctx: OrgContext, @Body() dto: CreateApiKeyDto): Promise<ApiKeyWithSecret> {
    return this.apiKeysService.create(ctx.orgId, dto.name);
  }

  @Get()
  @Roles("OWNER", "ADMIN", "MEMBER")
  list(@CurrentOrgContext() ctx: OrgContext): Promise<ApiKey[]> {
    return this.apiKeysService.listForOrg(ctx.orgId);
  }

  @Delete(":id")
  @Roles("OWNER", "ADMIN")
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@CurrentOrgContext() ctx: OrgContext, @Param("id") id: string): Promise<void> {
    return this.apiKeysService.revoke(ctx.orgId, id);
  }
}
