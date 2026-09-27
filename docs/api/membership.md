# Manual memberships — Phase 1.3

This is the local backend and shared access-policy foundation. Simulator enforcement and persistence follow in 1.5, simulator membership controls in 1.7, and the super-admin interface in 1.8. Checkout remains Phase 7. Electrical computation and basic safety findings are independent of membership.

## Local setup and first super admin

```sh
bun x wrangler d1 migrations apply DB --local --persist-to .wrangler/state
bun run dev:worker --port 8791
```

Register the intended operator account through the local Better Auth `POST /api/auth/sign-up/email` endpoint, supplying `name`, `email` and `password`. Signup always defaults to `individual`; it never bootstraps an administrator. Then, in another terminal, explicitly select that existing local account:

```sh
bun run bootstrap:super-admin --local --email operator@example.test
```

Replace the example email with the registered account. The command uses local bindings only, requires `--local`, and accepts `--persist-to` when the local Worker uses a different state directory. It refuses missing users, non-individual users and a second bootstrap while a different super admin exists. Repeating it for the same super admin is a no-op. The initial promotion and its `user.bootstrap` audit record commit together. No HTTP endpoint grants global roles.

`globalRole` is server-owned Better Auth data with `input: false` and default `individual`. Platform roles (`individual`, `admin`, `moderator`, `super_admin`) are separate from organization roles and paid grants. Membership administration requires exactly `super_admin`, including the existing `/api/admin/ping`. Staff receive no paid capability automatically.

## HTTP conventions

All routes are under `/api`. Private routes use real Better Auth session cookies, fresh primary D1 reads and `Cache-Control: private, no-store`. Mutation requests additionally require an `Origin` exactly matching the auth origin and `Content-Type: application/json`. Cross-site requests and missing origins are rejected. Cookie caching is disabled for auth; role and entitlement decisions do not trust session feature claims, public config or browser settings.

Membership timestamps in the API and new tables are **integer UTC Unix milliseconds**, matching Better Auth. Older standards/content tables retain their existing seconds-based fields. `startsAt` is inclusive, `endsAt` exclusive. Scheduled and expired states are derived at request time; there is no expiry cron.

Every mutation requires a nonempty `reason` (up to 1,000 characters). `PATCH` and `DELETE` also require the current integer `version`. Creation returns 201; successful edits/removals return 200. Unknown input fields are rejected. Bodies are limited to 32 KiB. List routes accept `limit` (default 30, maximum 100) and `offset` (default 0, maximum 1,000,000).

| Status | Meaning |
|---|---|
| 400 | Invalid fields, dates, handler/configuration or lifecycle transition |
| 401 | No valid session |
| 403 | Not a super admin, or failed same-origin check |
| 404 | Record not found |
| 409 | Stale version, concurrent reference/state change or conflicting unique data; reload before retrying |
| 413 / 415 | Body too large / JSON required |
| 503 | Auth/database service unavailable; no cached premium grant returned |

Private responses include a generated `X-Request-Id`, also saved with mutation audit records.

## Routes and payloads

| Route | Access and behavior |
|---|---|
| `GET /plans` | Public active plans with enabled, implemented, unarchived marketing benefits. No membership/user data. |
| `GET /me/membership` | Authenticated caller's capability union, `asOf`, `nextExpiry`, `nextChangeAt`, paginated `grants`, and `total`. Each grant includes its derived `state`. User-ID query parameters cannot select another account. |
| `GET /admin/pro/plans` | Super-admin paginated plans |
| `GET /admin/pro/plans/:id` | Plan plus `features`, `grantCount`, and `affectedMemberCount` for review before editing |
| `POST /admin/pro/plans` | Create a plan |
| `PATCH /admin/pro/plans/:id` | Edit fields and optionally replace the complete feature list |
| `DELETE /admin/pro/plans/:id` | Hard-delete an unused draft; otherwise archive |
| `GET /admin/pro/features[/:id]` | List/read supported benefit configuration; detail includes `referenceCount` |
| `POST /admin/pro/features` | Create a marketing/configuration record for an implemented handler |
| `PATCH /admin/pro/features/:id` | Edit localized text, enablement/order or `archived`; key and handler are immutable |
| `DELETE /admin/pro/features/:id` | Hard-delete an unreferenced benefit; otherwise archive its marketing record |
| `GET /admin/pro/memberships[/:id]` | List/read grants; list optionally filters by `userId` |
| `POST /admin/pro/memberships` | Assign a manual grant to an existing user and an active plan |
| `PATCH /admin/pro/memberships/:id` | Edit dates, suspend/resume or reassign to an active plan; user is immutable |
| `DELETE /admin/pro/memberships/:id` | Revoke and retain the row and audit history |
| `GET /admin/pro/users?q=...` | Paginated name/email search for the future member picker |
| `GET /admin/pro/audit` | Paginated audit, optionally filtered by `targetId` |

Plans accept:

```ts
{
  slug: string;                   // unique lowercase letters/digits with hyphens
  name: string;
  description?: string;
  priceMinor?: number | null;      // descriptive; not a payment receipt
  currency?: string | null;        // paired with price; three uppercase letters
  noExpiry: boolean;
  durationDays?: number | null;    // 1–36500 when noExpiry=false; null otherwise
  status: 'draft' | 'active' | 'archived';
  features?: Array<{ featureKey: string; enabled: boolean; config?: {} }>;
  reason: string;
}
```

Names, prices and duration policies are administrator-supplied. No commercial plan is seeded. Duplicate feature keys are rejected. Omit `features` in a patch to retain links; send `[]` to remove all links. Price/default-duration edits leave existing grant dates unchanged. `affectedMemberCount` counts distinct users with unrevoked, unexpired grants, including scheduled/suspended grants; `grantCount` includes all retained history.

Benefits accept `key`, `handler`, localized `name` and `description` maps, `enabled`, optional `sortOrder`, optional `archived`, and `reason`. Localized text requires an `en` fallback and accepts up to 40 locales. Only three boolean handlers are implemented:

- `pro_components`
- `advanced_faults`
- `advanced_diagnostics`

Migration 0004 seeds their descriptive records, without any plan or grant. Their only valid configuration is `{}`. Unknown handlers cannot be created, advertised or resolved into capabilities. Additional benefits need code and validation before they can authorize anything. Marketing edits cannot introduce executable behavior or change electrical rules.

Manual grants accept:

```ts
{
  userId: string;
  planId: string;
  status: 'active' | 'suspended' | 'revoked';
  startsAt: number;
  endsAt: number | null;
  noExpiry: boolean;
  reason: string;
}
```

Grant dates are explicit: a future assignment form can prefill from the plan's duration policy, but the API never silently changes existing dates. `endsAt > startsAt` is required unless `noExpiry: true` and `endsAt: null` are supplied together. The server fixes `source` to `manual`. A revoked row is terminal; grant again with a new assignment. All these fields except `userId` can be edited before revocation. Patches merge omitted fields with stored data, then validate the full result.

## Access and deletion semantics

`@electrasim/access` resolves the union across active, currently valid grants. Suspending, expiring or revoking one grant removes only its contribution. Plan feature edits and explicit feature disablement affect existing grants on the next fresh check. Archiving a plan prevents new assignments; archiving feature marketing hides it from public plans/new attachments. Both retain existing capabilities. `enabled: false` explicitly stops a feature authorizing access. Feature marketing can be restored with `archived: false`.

`plan_features` is the single canonical source of plan benefits. No `featuresJson` subscription store exists. Foreign keys protect grant history, and no membership delete cascades into users or content. Audits retain before/after snapshots even when an unused record is hard-deleted.

Each administrative mutation uses a D1 batch transaction. The first write checks the version, the actor's current super-admin role and any applicable active-plan/reference conditions. An internal random mutation token ties feature replacements and audit insertion to that successful write. Losing concurrent requests cannot alter links or append a success audit. Audit failure rolls back the data write. Record/detail reads also batch version, feature links and impact counts together.

The shared pure classifier uses canonical component IDs, fault IDs and a validated scenario mode. All 115 components and 14 fault types are covered. It distinguishes deliberate multi-fault exercises from naturally detected hazards; all confirmed basic single faults remain free. Ohmageddon requires advanced diagnostics and advanced faults, plus Pro components if present. Domain simulation imports no access code. Callers must validate content and normalize legacy injected faults before classification; wiring those action boundaries and downgrade-safe document handling is Phase 1.5/1.7 work.

## Verification

```sh
bun run check
bun run test:membership
```

The dedicated API gate creates a new `.wrangler/membership-tests-*` directory, applies the actual migrations, starts the actual Hono Worker using `wrangler.membership-test.jsonc`, registers users with Better Auth and uses issued session cookies. It also executes the operator bootstrap command, tests role/CSRF denial, concurrent edits, lifecycle changes, marketing archive versus disablement, and forced audit/read failures. It shuts down its test Worker and leaves local evidence in the isolated directory. It does not change ordinary development users or call any live site.
