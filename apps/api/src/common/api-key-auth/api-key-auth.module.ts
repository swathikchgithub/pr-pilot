import { Module } from "@nestjs/common";
import { ApiKeyAuthService } from "./api-key-auth.service";

/** Leaf module: validates API-key bearer tokens against the DB. No dependency on ApiKeysModule (CRUD). */
@Module({
  providers: [ApiKeyAuthService],
  exports: [ApiKeyAuthService],
})
export class ApiKeyAuthModule {}
