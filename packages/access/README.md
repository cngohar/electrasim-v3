# @electrasim/access

Pure shared membership resolution and content classification for the browser and Hono Worker. The API contract and local bootstrap are documented in [membership.md](../../docs/api/membership.md).

- Inputs are fresh server-resolved grants and an explicit UTC Unix-millisecond clock. Roles do not grant capabilities.
- Supported handlers are code-owned booleans. Unknown/malformed config fails closed.
- Content classification uses the canonical domain catalog. Validate content and normalize legacy injected faults before calling; do not pass client-claimed tiers or requirement arrays.
- Basic physical findings remain outside access control. This module does not modify, run or authorize the electrical solver by itself.
- `nextChangeAt` includes future starts and expiries; it is a refresh hint, never permission to skip fresh authorization.

Phase 1.3 provides this foundation. Supported simulator entry points and client downgrade behavior are integrated during 1.5/1.7.
