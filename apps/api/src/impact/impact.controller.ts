import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { ImpactAnalysisResponse } from "@pr-pilot/types";
import { OrgAuthGuard } from "../common/guards/org-auth.guard";
import { CurrentOrgContext } from "../common/decorators/org-context.decorator";
import type { OrgContext } from "../common/org-context";
import { ImpactService } from "./impact.service";
import { ImpactAnalysisDto } from "./dto/impact-analysis.dto";

@Controller("v1/impact-analysis")
@UseGuards(OrgAuthGuard)
export class ImpactController {
  constructor(private readonly impactService: ImpactService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  run(@CurrentOrgContext() ctx: OrgContext, @Body() dto: ImpactAnalysisDto): Promise<ImpactAnalysisResponse> {
    return this.impactService.run(ctx, dto);
  }
}
