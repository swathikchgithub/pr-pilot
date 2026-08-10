import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import type { AppConfig } from "../../config/configuration";
import { SessionTokenService } from "./session-token.service";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const app = config.getOrThrow<AppConfig>("app");
        return {
          secret: app.jwtSecret,
          signOptions: { expiresIn: app.jwtExpiresIn },
        };
      },
    }),
  ],
  providers: [SessionTokenService],
  exports: [SessionTokenService],
})
export class TokenModule {}
