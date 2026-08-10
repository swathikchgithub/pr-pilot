import { Module } from "@nestjs/common";
import { ApiKeyAuthModule } from "./api-key-auth/api-key-auth.module";
import { OrgAuthGuard } from "./guards/org-auth.guard";
import { RolesGuard } from "./guards/roles.guard";

/** Provides the guards every protected feature module (api-keys, repos, query, impact, audit) depends on. */
@Module({
  imports: [ApiKeyAuthModule],
  providers: [OrgAuthGuard, RolesGuard],
  // Re-export ApiKeyAuthModule too: OrgAuthGuard is applied via `@UseGuards()`
  // in consuming modules' controllers, and Nest resolves that guard's own
  // constructor deps against the *consuming* module's visible providers — so
  // ApiKeyAuthService must be transitively visible there, not just here.
  exports: [ApiKeyAuthModule, OrgAuthGuard, RolesGuard],
})
export class AuthCommonModule {}
