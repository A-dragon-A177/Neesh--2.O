# Security TODO: Admin Authentication System

## Current State

The frontend (`src/hooks/useAdminAuth.ts`, `src/lib/adminApi.ts`) implements a custom
admin token scheme:

- `adminLogin()` calls `POST /api/admin/login` → expects `{ token, displayName }`
- Token stored in `localStorage` under key `'neesh_admin_token'`
- `adminFetch()` sends `Authorization: AdminToken <token>` on all admin API calls

**The backend has NO `/api/admin/login` endpoint and NO `AdminToken` middleware.**

All actual admin routes are protected by `supabaseAuth + requireRole('ADMIN')`, which
only reads `Authorization: Bearer <supabase-jwt>`. The custom `AdminToken` scheme is
therefore never validated — admin panel API calls would 401.

## Risk

Currently **not exploitable**: because `POST /api/admin/login` returns 404, the
`adminLogin()` call fails, `setAdminSession()` is never called, and no token is ever
stored in `localStorage`. The XSS-accessible localStorage risk is theoretical only.

However, **once the endpoint is implemented**, storing the token in `localStorage` would
be a real XSS risk.

## Required Fix (before implementing /api/admin/login)

1. **Backend**: Implement `POST /api/admin/login` — verify admin credentials against
   Supabase users with `role='ADMIN'`, return a **short-lived JWT signed with a server
   secret** (not the Supabase service-role key).

2. **Backend**: Add `adminTokenAuth` middleware that validates `Authorization: AdminToken
   <token>` using `crypto.timingSafeEqual`, or — preferably — **migrate admin routes to
   use the existing `supabaseAuth + requireRole('ADMIN')` flow directly**.

3. **Frontend**: Replace `localStorage.setItem(ADMIN_TOKEN_KEY, token)` with:
   ```typescript
   // The backend sets the cookie:
   // Set-Cookie: admin_session=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/admin
   ```
   Remove `getToken()` and `Authorization: AdminToken` header from `adminFetch()`.

4. **Simplest path**: Delete the custom `AdminToken` scheme entirely. Admin users log in
   via normal Supabase auth (`signInWithPassword`), and their Supabase JWT (which has
   `role='ADMIN'`) is used with `Authorization: Bearer <supabase-jwt>` — the backend
   `supabaseAuth + requireRole('ADMIN')` middleware already handles this correctly.

## Related Files

- Frontend: `idea-lab-main/src/hooks/useAdminAuth.ts`
- Frontend: `idea-lab-main/src/lib/adminApi.ts`
- Frontend: `idea-lab-main/src/pages/Login.tsx` (admin email check)
- Backend: `src/index.ts` (no `/api/admin/login` route registered)
