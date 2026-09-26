# ElectraSim V3 workspace rules

- Development and testing are local only. The existing Cloudflare account serves the live `electrasim.com` site and must not be used for this rewrite.
- The user removed the old account's local credentials on 2026-09-26. Do not restore them, log into that account, or run Cloudflare logout/revocation/account/resource operations.
- A new Cloudflare account will be configured after development is finished. Remote operations require the user to provide that new account and explicitly authorize the operation; passing local tests is not deployment authorization.
- Use Wrangler with `--local` and local persistence for Worker/D1/R2/KV/Queues/Durable Objects. Never run remote deploy, migration, seed, resource creation/deletion, or tests against the live website.
- Do not add account IDs, API keys/tokens or OAuth/refresh credentials to this repository. Keep local bindings as placeholders and keep `.dev.vars*` / `.env*` ignored.
- `bun run deploy` is intentionally disabled. `bun run seed:standards --local`, `bun run dev:worker` and localhost test targets are the supported workflows. Do not remove these restrictions as part of routine implementation.
- Continue the Phase 1 plan in `docs/phases/phase-1-simulator-core.md`. This local-only instruction overrides older roadmap/deployment instructions, including archived docs.
