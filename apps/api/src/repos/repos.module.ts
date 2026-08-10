import { Module } from "@nestjs/common";
import { AuthCommonModule } from "../common/auth-common.module";
import { ReposController } from "./repos.controller";
import { ReposService } from "./repos.service";
import { IngestQueueService } from "./ingest-queue.service";

@Module({
  imports: [AuthCommonModule],
  controllers: [ReposController],
  providers: [ReposService, IngestQueueService],
  exports: [ReposService],
})
export class ReposModule {}
