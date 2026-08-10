import { Module } from "@nestjs/common";
import { AuthCommonModule } from "../common/auth-common.module";
import { ReposModule } from "../repos/repos.module";
import { RetrievalModule } from "../retrieval/retrieval.module";
import { AuditModule } from "../audit/audit.module";
import { QueryController } from "./query.controller";
import { QueryService } from "./query.service";

@Module({
  imports: [AuthCommonModule, ReposModule, RetrievalModule, AuditModule],
  controllers: [QueryController],
  providers: [QueryService],
})
export class QueryModule {}
