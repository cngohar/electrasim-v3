# Profiles — concept 01

**2026-10-25: local interactive demo built for owner review. Owner approved the concept and authorized local integration on 2026-10-25.
The concept remains isolated; product implementation has separate gates/evidence.**

Start the preview:

```bash
bun run demo:profiles
```

Open **http://127.0.0.1:8795/**. The screens have bookmarkable hash routes:

- `/#public`: public identity/about, empty circuits, visitor/member/owner preview,
  report/sign-in prompt, duplicate report acknowledgement and neutral unavailable state.
- `/#edit`: display name, handle, avatar upload/removal, bio, institution/level,
  independent visibility controls, future fork default and live card preview.
- `/#staff`: profile context, reasoned hide/restore/remove/avatar removal, report
  outcomes, read-only staff persona, revision conflict and sample action history.

Use **Reset demo** to choose public, new/unclaimed, private, staff-hidden or removed
sample states. Reload also resets everything. To review claim validation, load New
member, open Edit profile, and try `admin` (reserved), `alex_morgan` (claimed), then
a new lowercase handle. Claim confirmation explains the proposed permanent address.

To review moderation, hide a profile with a reason, edit/save as the owner, then
check the public view: the profile stays unavailable. Restore a private profile
and it stays private. In a staff review, select **Simulate another edit before this
save** to see stale decision recovery. Removing a profile retains a tombstone with
no restore action. Report decisions and profile visibility are separate actions.

The design uses the existing ElectraSim local fonts, blue controls and light
working surface; the staff panel echoes the accepted dark admin rail. The circuit
motif is decorative SVG. No generated imagery, external fonts or network service
is needed. All identities and institution details are fictional.

The server binds only to `127.0.0.1`, serves this folder plus allowlisted local fonts
and favicon, accepts GET/HEAD only, and applies `connect-src 'none'`,
`form-action 'none'` and noindex. No authentication, API, Worker, database, browser
storage, Cloudflare account or remote service is used. Uploaded photos stay in page
memory. Personas demonstrate presentation only and do not prove authorization.

## Approved decisions

Review the layout, profile fields, privacy defaults, avatar limits and report/staff
workflows. In particular: **claim a handle once, with no member rename UI in this
first release**, and **new profiles start private**. The owner approved this design and authorized local integration on 2026-10-25;
design approval is separate from the subsequently completed local product acceptance (2026-10-26). See the [runtime audit](../../audits/phase-2-profiles.md) and [manifest](../../audits/data/phase21-acceptance.json).
See the [execution plan](../../plans/PHASE_2_1_PROFILES_PLAN.md).

## Verification

```bash
bun run check:profiles-demo
```

This command owns an isolated loopback server on port 8796 and stops it afterward.
It checks desktop/phone Chromium and tablet WebKit interactions, viewport containment,
plain-text encoding, invalid/valid avatar selection, privacy field suppression,
neutral private/hidden/removed states, moderation/edit/restore boundaries, report
submission/dedupe/outcome, read-only controls, stale decisions and reserved/taken/
invalid/claimed handles. It checks same-origin GET-only browser traffic, CSP errors
and server method/noindex headers. Screenshots/results stay ignored under
`.wrangler/profiles-design/`. Current results and limitations are recorded in the
[profile audit](../../audits/phase-2-profiles.md).

These checks exercise the prototype only. Server rendering, real file validation,
storage, authentication, permissions, rate limits, audit atomicity and HTTP races
require the separate product implementation and acceptance gates.

The real integration uses `/settings/profile/` for owner settings, `/u/:handle`
for public SSR and `/admin/community/` for authorized staff. The three concept
tabs remain a review convenience here; they are not public product navigation.
