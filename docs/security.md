# Security Considerations

## Secrets management

- `.env*` files (except `.env.example`) are gitignored at the repo root — verified in
  `.gitignore`. Never commit real values.
- **Incident on this project**: the pre-rebuild prototype had live Supabase/Gemini/
  Cohere keys committed in `.env.local` *and* duplicated inside `public/.env.local` —
  the latter would have been served statically and unauthenticated by Next.js if
  deployed. Both were removed during the rebuild (`_legacy-v0/`). If you inherit an
  older checkout, treat any keys that were ever in `public/` as compromised — rotate
  them, don't just delete the file.
- `JWT_SECRET` and `API_KEY_PEPPER` are required, length-validated env vars
  (`env.validation.ts`) — the API refuses to boot without them, rather than falling
  back to an insecure default.

## AuthN / AuthZ

- Passwords: bcrypt, 12 rounds (`auth.service.ts`).
- Dashboard sessions: signed JWT in an `httpOnly`, `Secure` (production), `SameSite=None`
  (production) cookie — never readable by client-side JS, mitigating session-cookie
  theft via XSS.
- API keys: `prp_<32 random bytes, base64url>`, stored as `sha256(secret + serverPepper)`
  — never stored or logged in plaintext. Revocation is immediate (`revokedAt` checked
  on every request, not just at issuance).
- Every data-access query is scoped by the verified `orgId` from `OrgContext`, never by
  a value from the request body/params — see `ReposService`, `AuditService`,
  `ApiKeysService`. This is the IDOR (insecure direct object reference) mitigation:
  there is no endpoint where supplying another org's ID grants access to its data.
- Role separation: API keys can query/analyze but cannot manage other API keys or org
  settings (`RolesGuard` only recognizes the dashboard-session path) — least privilege
  for the agent/CI credential type.

## Input validation

- Every controller method's body/query is a `class-validator` DTO; the global
  `ValidationPipe` uses `whitelist: true, forbidNonWhitelisted: true` — unexpected
  fields are rejected outright, not silently stripped or passed through.
- `githubUrl` is validated both by `class-validator`'s `@IsUrl` *and* a strict
  `github.com/<owner>/<repo>` regex before any DB write or GitHub API call.

## Injection defense

- No string-concatenated SQL anywhere in the codebase. The two raw-SQL call sites
  (`hybrid-search.service.ts`, `persist-chunks.ts`) both use Prisma's tagged-template
  `$queryRaw`/`$executeRaw`, which parameterizes every interpolated value.
- `toVectorLiteral()` rejects `NaN`/`Infinity` before a value is ever interpolated into
  a query, closing off a theoretical malformed-literal injection vector via a corrupted
  embedding.

## Prompt injection (LLM-specific)

- Both LLM call sites (`generation.service.ts`, `impact-generation.service.ts`) use a
  system prompt that explicitly names the retrieved `<context>`/`<candidates>` block as
  untrusted data and instructs the model to ignore any directives found inside it —
  mitigating indirect prompt injection via malicious content committed to a repo being
  indexed.
- Impact-analysis output is cross-validated: any `filename`/`startLine`/`endLine` the
  model reports that doesn't match an actual retrieved candidate is dropped before the
  response is returned (`impact-generation.service.ts`'s `resolveAffectedChunks`) —
  the model cannot cause PR-Pilot to report a hallucinated affected file as fact.

## Error handling

- `HttpExceptionFilter` normalizes every error to `{ statusCode, error, message }` and
  masks anything that isn't a deliberately-thrown `HttpException` as a generic 500 —
  stack traces, DB connection strings, and other internal detail never reach the
  client. Server-side, the full error is still logged for debugging.

## Rate limiting

- Global default: 120 requests/min/IP (`ThrottlerModule` in `app.module.ts`).
- Tighter limits on expensive/sensitive routes: login 10/min, register 5/min,
  `/v1/query` and `/v1/impact-analysis` 20/min (both call paid LLM APIs per request).

## Dependency hygiene

- All dependencies are pinned to `^x.y.z` ranges in each workspace's `package.json`,
  not `*`/`latest`.
- Run `npm audit` periodically; none of this project's dependencies are exempted from
  that process.

## What is explicitly NOT hardened yet (be honest about this)

- No automated secret-scanning hook (`git-secrets`/`trufflehog`) wired into CI in this
  repo — add one before this becomes a real multi-contributor project.
- No WAF/SSRF-specific allowlisting on the GitHub API calls beyond the URL-shape
  validation above — acceptable today because the only outbound URLs are
  `api.github.com` (hardcoded, not user-supplied), not proxying arbitrary user input.
- No automated dependency-vulnerability gate (Dependabot/Snyk) configured in this
  repo's CI — add one before production use at scale.
