import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import type { AuditEventType } from "@pr-pilot/types";

export class ListAuditLogDto {
  @IsString()
  @IsOptional()
  repoId?: string;

  @IsIn(["QUERY", "IMPACT_ANALYSIS"])
  @IsOptional()
  eventType?: AuditEventType;

  @IsString()
  @IsOptional()
  cursor?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
