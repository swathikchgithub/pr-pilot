import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { Repo } from "@pr-pilot/types";
import { OrgAuthGuard } from "../common/guards/org-auth.guard";
import { CurrentOrgContext } from "../common/decorators/org-context.decorator";
import type { OrgContext } from "../common/org-context";
import { ReposService } from "./repos.service";
import { CreateRepoDto } from "./dto/create-repo.dto";

@Controller("v1/repos")
@UseGuards(OrgAuthGuard)
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Post()
  create(@CurrentOrgContext() ctx: OrgContext, @Body() dto: CreateRepoDto): Promise<Repo> {
    return this.reposService.create(ctx.orgId, dto);
  }

  @Get()
  list(@CurrentOrgContext() ctx: OrgContext): Promise<Repo[]> {
    return this.reposService.listForOrg(ctx.orgId);
  }

  @Get(":id")
  getById(@CurrentOrgContext() ctx: OrgContext, @Param("id") id: string): Promise<Repo> {
    return this.reposService.getById(ctx.orgId, id);
  }
}
