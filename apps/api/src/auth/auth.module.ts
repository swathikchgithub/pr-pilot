import { Module } from "@nestjs/common";
import { AuthCommonModule } from "../common/auth-common.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [AuthCommonModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
