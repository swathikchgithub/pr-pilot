import { Module } from "@nestjs/common";
import { AuthCommonModule } from "../common/auth-common.module";
import { ReposModule } from "../repos/repos.module";
import { RetrievalModule } from "../retrieval/retrieval.module";
import { AuditModule } from "../audit/audit.module";
import { ImpactController } from "./impact.controller";
import { ImpactService } from "./impact.service";
import { ImpactGenerationService } from "./impact-generation.service";

@Module({
  imports: [AuthCommonModule, ReposModule, RetrievalModule, AuditModule],
  controllers: [ImpactController],
  providers: [ImpactService, ImpactGenerationService],
})
export class ImpactModule {}
