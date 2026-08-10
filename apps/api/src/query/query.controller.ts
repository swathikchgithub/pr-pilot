import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { QueryResponse } from "@pr-pilot/types";
import { OrgAuthGuard } from "../common/guards/org-auth.guard";
import { CurrentOrgContext } from "../common/decorators/org-context.decorator";
import type { OrgContext } from "../common/org-context";
import { QueryService } from "./query.service";
import { QueryDto } from "./dto/query.dto";

@Controller("v1/query")
@UseGuards(OrgAuthGuard)
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  run(@CurrentOrgContext() ctx: OrgContext, @Body() dto: QueryDto): Promise<QueryResponse> {
    return this.queryService.run(ctx, dto);
  }
}
