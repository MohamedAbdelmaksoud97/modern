# Modern Platform Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development for independent implementation work and review each boundary.

**Goal:** Deliver a persistent Arabic engineering office ERP/CRM, landing page and client portal.

**Architecture:** Existing Next.js app, server APIs, private Supabase Postgres schema, per-request identity and RLS, secure sessions. WAHA adapter and durable queue.

**Tech Stack:** Next 16.4.6, React 19, TypeScript, Tailwind 4, Base UI shadcn, pg, zod, Playwright.

**Spec:** docs/superpowers/specs/2026-11-15-modern-platform-design.md

## Global Constraints
- Preserve user-supplied changes and logo. Arabic RTL; primary #C1AA70.
- No client-supplied role trusted; all write commands authorized server-side.
- No invented completed projects or company claims.
- No real WhatsApp sends during tests.

## Review Focus
- Cross-client and early supervisor access must be rejected by APIs and database.
- Concurrent financial writes and workflow transitions must lock project and enforce constraints.
- Missing environment or WAHA outage must fail clearly without fake success.
- First-login password rotation, disabled sessions and reset revocation must work.
- Mobile forms, RTL menus, empty states, upload validation and keyboard access must remain usable.

### Task 1: Backend and persistence
Files: lib/server/*, app/api/auth/*, app/api/data/*, app/api/commands/*, app/api/files/*, database/*, scripts/db-*.mjs, tests/backend*.
Produces: contracts in lib/types.ts, secure JSON data endpoint, command endpoint and file endpoint. lib/server/db.ts exports pool and withActor(user, callback); lib/server/auth.ts exports getUser() and requireUser().
- [ ] Write failing authorization/workflow/finance tests, observe fail.
- [ ] Implement schema, accounts, sessions, role policies, business transactions and audit/outbox.
- [ ] Migrate configured database without modifying unrelated schemas; bootstrap a manager with generated credentials in ignored .local/.
- [ ] Verify domain tests and real database isolation and persistence.

### Task 2: Public site
Files: app/page.tsx, components/landing/*, public/illustration*, app/api/inquiries/*.
Consumes public portfolio and inquiry backend via helper or /api/public. No auth dependency. Existing company logo and verified contact links.
- [ ] Build public RTL landing, actual published portfolio section and consultation form.
- [ ] Verify mobile/desktop and form behavior using Playwright after integration.

### Task 3: WAHA
Files: lib/server/whatsapp.ts, app/api/whatsapp/*, app/api/webhooks/waha/*, app/api/cron/notifications/*, tests/whatsapp*, deployment/*.
Consumes shared schema and server auth/db APIs, produces manager status/session/queue API.
- [ ] Write tests for signature rejection, privacy suppression, retry semantics.
- [ ] Implement adapter, durable dispatcher, preferences, templates, webhook replay and delivery state.
- [ ] Verify with local fake provider, never real customer messages; document pairing and cron.

### Task 4: App UI
Files: app/login/*, app/workspace/*, app/portal/*, components/platform/*, app/globals.css, app/layout.tsx.
Consumes lib/types.ts, /api/data, /api/commands, /api/auth/* and /api/files.
- [ ] Build shell, secure login/password change, dashboard, all CRUD/workflow and reporting screens, permission controls, portal.
- [ ] Verify validation/empty/error/loading states and responsive RTL layouts.

### Task 5: Integration and release verification
Files: tests/e2e/*, playwright.config.ts, README.md, .env.example, docs/DEPLOYMENT.md.
- [ ] Run lint/typecheck/domain+DB tests and production build.
- [ ] Playwright production-server scenarios: login, password change, create client/project, assignments, required documents, transitions, finance, permissions, supervisor/other-client denial, contact inquiry, responsive public pages.
- [ ] Independent review, fix verified issues, rerun affected checks.
- [ ] Record exact test results and unresolved external prerequisites; no unsupported production-ready claim.
