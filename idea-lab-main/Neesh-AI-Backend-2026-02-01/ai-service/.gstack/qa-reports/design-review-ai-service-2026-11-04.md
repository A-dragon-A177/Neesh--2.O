# Design Review — ai-service backend
**Date:** 2026-11-04  
**Phase:** 7 / /design-review  
**Target:** `src/` — route registration, controllers, middleware, webhook pipeline  
**Status:** complete  
**Commits:** see Phase 7 commits

---

## Scope

This review adapted the /design-review skill for a pure backend Express/TypeScript API (no frontend).  
Covered: HTTP contract consistency, response shape design, middleware ordering, controller/service boundaries, error handling patterns, and security-correctness issues introduced by API design decisions.

---

## Summary

One HIGH bug (DR-1) where the webhook amount verification logic silently drops all valid payment webhooks when credits partially cover a sprint purchase. Two MEDIUM findings corrected the identity-extraction pattern and an HTTP status inconsistency. One MEDIUM finding left as a follow-up (typed errors require service-layer refactor). Two LOW/INFO findings are filed for future cleanup.

Three fixes applied and committed; one deferred to QA-4 schema migration.

---

## Findings

### DR-1 — FIXED (HIGH)
**Webhook amount verification rejects valid webhooks for partial-credit sprint purchases**

- **Files:** `src/controllers/WebhookController.ts:155`, `WebhookController.ts:171`
- **Was:**
  ```typescript
  if (webhookPaise > 0n && webhookPaise !== internalPaise) { /* amount_mismatch → ignored */ }
  ```
  `internalPaise` = `sprintSession.amount_paise` (gross purchase total).  
  When a founder applies partial credits, Cashfree is charged only `chargeAmountPaise` (net), which is less than the gross.  
  The webhook reports the net charge → `webhookPaise !== internalPaise` → webhook silently dropped → sprint stays `PAYMENT_PENDING` forever.
- **Fix (partial):**
  ```typescript
  if (webhookPaise > internalPaise) { /* only block inflated amounts */ }
  ```
  Blocks fraud (Cashfree cannot report more than the agreed order total) while accepting net-of-credit charges.  
  Same fix applied to both the sprint session and the direct request branches.
- **Deferred (full fix):** Store `charge_amount_paise` on `sprint_sessions` (QA-4 schema migration). Once available, verify `webhookPaise === chargeAmountPaise` exactly.
- **Impact without fix:** Every sprint purchase that uses partial credit balance would create a Cashfree payment that completes on the gateway, then never activates the sprint. Founder loses money, sprint stays pending.

---

### DR-2 — FIXED (MEDIUM)
**`(req as any).user?.sub` dead-code fallback suppresses TypeScript safety**

- **Files:** `SprintController.ts:23,293,427`, `DirectRequestController.ts:17,58,96,134`, `InteractionController.ts:17,70,104`
- **Was:** `const userId = (req as any).user?.id || (req as any).user?.sub;`
- **Why wrong:** `supabaseAuth` always populates `req.user = { id: userId, ... }` and the Express namespace augmentation (`namespace Express { interface Request { user?: AuthenticatedUser } }`) is declared in `supabaseAuth.ts`. The `(req as any)` cast suppresses TypeScript safety unnecessarily. The `.sub` fallback is dead code — `supabaseAuth` always uses the `.id` field.
- **Fix:** `const userId = req.user?.id;` — typed, no cast, no dead fallback.
- **Note:** `DashboardController`, `ExplorerController`, and `SparkController` have similar casts but also include hardcoded dev-UUID fallbacks (`|| '00000000-0000-0000-0000-000000000002'`). Those require a separate audit to confirm they are dead in production before removal — left as DR-6.

---

### DR-3 — FIXED (MEDIUM)
**`POST /api/sprints/purchase` returns 200 instead of 201 for newly created resources**

- **Files:** `src/controllers/SprintController.ts:199,270`
- **Was:** Both the balance-paid ACTIVE path and the Cashfree PAYMENT_PENDING path returned `res.status(200)`.
- **Fix:** Changed to `res.status(201)` for new sprint sessions.  
  The idempotency recovery path (existing PAYMENT_PENDING session returned) correctly keeps `200`.
- **Contrast:** `POST /api/direct-requests` already returns 201 — this restores consistency.

---

### DR-4 — DEFERRED (MEDIUM)
**Error classification via string matching in `DirectRequestController.create()`**

- **File:** `src/controllers/DirectRequestController.ts:47`
- **Issue:**
  ```typescript
  const isValidation = err.message?.includes('characters') || err.message?.includes('required');
  res.status(isValidation ? 400 : 500).json({ error: err.message });
  ```
  Brittle: an infrastructure error message containing "required" (e.g. `"Database index required"`) would be classified 400 instead of 500.
- **Resolution:** `DirectRequestService` should throw typed errors (a `ValidationError` class with `statusCode: 400`) rather than free-text messages. Deferred — requires service-layer changes across multiple services.

---

### DR-5 — INFO
**Dual webhook URL paths undocumented**

- **File:** `src/index.ts:206-207`
- `POST /api/webhooks/cashfree` and `POST /api/webhook/cashfree` alias the same handler.  
  Both appear in the supabaseAuth bypass list. This is intentional for forward-compatibility, but the alias is undocumented in the route file.
- **No change needed.** Add a comment in `index.ts` noting the alias purpose.

---

### DR-6 — INFO
**Hardcoded dev UUID fallbacks in DashboardController, ExplorerController, SparkController**

- **Files:** `DashboardController.ts:54,123,229`; `ExplorerController.ts:293`; `SparkController.ts:22`
- Pattern: `const userId = (req as any).user?.id || req.query.userId || '00000000-0000-0000-0000-000000000002';`
- Dev-time scaffolding that was never removed. `supabaseAuth` guards these routes, so the fallback UUID should be unreachable in production — but its presence masks auth failures in tests that bypass middleware.
- **Deferred:** Needs an audit of which test paths exercise these routes, then removal.

---

## Coverage

| Area | Reviewed | Notes |
|---|---|---|
| `src/index.ts` | ✓ | 632 lines, 80+ routes inline — no route files |
| `src/middleware/supabaseAuth.ts` | ✓ | HS256 JWT + Supabase API fallback; normalizeRole safe |
| `src/middleware/requireRole.ts` | ✓ | Clean RBAC middleware |
| `src/middleware/adminTokenAuth.ts` | ✓ | AdminToken scheme correct; constant-time comparison in login |
| `src/controllers/SprintController.ts` | ✓ | DR-2, DR-3 fixed |
| `src/controllers/WebhookController.ts` | ✓ | DR-1 fixed; 8-step pipeline otherwise correct |
| `src/controllers/DirectRequestController.ts` | ✓ | DR-2 fixed; DR-4 deferred |
| `src/controllers/InteractionController.ts` | ✓ | DR-2 fixed |
| `src/services/DirectRequestService.ts` | ✓ (prior QA read) | Dead code QA-5 unchanged |
| Response shape consistency | ✓ | BigInt paise serialized as strings throughout — consistent |
| Middleware ordering | ✓ | CORS → body-parser → tracing → global rate limit → auth → role guards |
| Public route bypass list | ✓ | Correctly excludes auth for /public/, /webhooks/, /webhook/, SSR paths |
| Admin dual-auth (AdminToken vs Supabase) | ✓ | Clean separation; admin grade routes use adminTokenAuth only |

## Positive Observations

- Middleware ordering is correct: CORS → tracing → global rate-limit → supabaseAuth → requireRole. No auth guard is applied before rate limiting.
- The admin login endpoint uses `crypto.timingSafeEqual` with length padding — correct constant-time comparison.
- `parsePaise()` in WebhookController handles decimal string → BigInt without float arithmetic — correct.
- `normalizeRole()` in supabaseAuth always defaults to `FOUNDER`, never `ADMIN` — safe failure mode.
- All BigInt paise amounts are serialized as strings throughout response shapes — consistent and correct.
- Webhook STEP 3 idempotency checks both sprint and directRequest confirmation keys in one query.
