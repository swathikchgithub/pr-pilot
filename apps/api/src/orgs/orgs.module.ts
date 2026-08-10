import { Module } from "@nestjs/common";
import { AuthCommonModule } from "../common/auth-common.module";
import { OrgsController } from "./orgs.controller";
import { OrgsService } from "./orgs.service";

@Module({
  imports: [AuthCommonModule],
  controllers: [OrgsController],
  providers: [OrgsService],
})
export class OrgsModule {}
