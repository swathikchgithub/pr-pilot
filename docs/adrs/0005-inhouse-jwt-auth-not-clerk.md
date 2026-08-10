# ADR 0005: In-house JWT + bcrypt auth for the dashboard, not Clerk/Auth.js

## Status
Accepted

## Context
The default stack guidance is "Clerk / Auth.js / Supabase Auth depending on fit." The
dashboard's auth needs are: email+password registration tied to creating an
Organization, a session usable by a separately-deployed API service (not just
Next.js), and role storage (`OWNER`/`ADMIN`/`MEMBER`) scoped to that org.

## Decision
Implement auth directly in NestJS: bcrypt password hashing, a signed JWT session
carried in an httpOnly cookie, issued/verified by the API itself.

## Consequences
- No third-party auth dependency or account needed to run the MVP end-to-end locally
  or in CI — one less external service in the critical path.
- The session must work across two origins (Vercel-hosted web app, Railway-hosted API),
  which the implementation already handles via `SameSite=None; Secure` in production
  and CORS `credentials: true` with an explicit origin allowlist.
- Trade-off, explicitly deferred to v2: no SSO/SAML, no social login, no built-in MFA.
  Clerk or Auth.js becomes worth the integration cost once an enterprise customer asks
  for SSO — the `AuthService`/`SessionTokenService` boundary is narrow enough to swap
  without touching the rest of the API.
