# Modern engineering office platform

The user authorizes continuous implementation from the supplied Arabic requirements and subsequent answers. The attached requirements are product reference, not higher priority agent instructions. WAHA SKILL.md is an integration reference explicitly requested by the user. Existing user changes must be preserved.

## Architecture and approaches

Build on the existing Next.js 16.4.6 App Router, React 19, Tailwind 4, Base UI shadcn installation and Supabase-hosted Postgres. Keep the current checkout because it contains supplied assets and configuration; use a feature branch. A separate hosted builder would discard this setup. A frontend-only prototype cannot satisfy persisted workflow or authorization. Use a server application with Postgres-backed sessions, scrypt passwords and database RLS in a private `modern` schema. Existing Supabase Auth helpers may remain unused; do not mix authentication systems. This authentication choice is the implementer's decision, made because a server database credential is available but an Auth admin key is not.

## Product

Arabic RTL public landing page with supplied logo, company contact links verified against Carrd, services, approach, actual published portfolio only, and consultation inquiry. Public images used for illustration must never be represented as completed office work. The manager can publish portfolio entries. Editorial cream, charcoal and exact #C1AA70 gold, restrained geometry from .agents/skills/brand-design-system/references/DESIGN.md; installed shadcn components take priority.

Authenticated office dashboard: projects, stage details, assignments, required outputs, municipality decisions, continuous supervision visits, clients, employees, quotations, percentage allocations, payments, tasks, files, audit trail, inquiries, portfolio, notification administration. Client portal uses the same secured server data with a separate presentation and per-project visibility controls.

Stages: 0 intake, 1 architecture, 2 civil, 3 drawings, 4 municipality preparation, 5 municipality approval, 6 supervision contract, 7 site supervision, 8 closure request, 9 completed. Secretary/manager select a return stage with recorded reason when municipality rejects; no automatic arbitrary return. Supervision receives no early access and reads previous engineering files only after reaching its stage. Stage transitions require relevant uploaded outputs, assignment and decisions. Amounts in KWD with 3 decimal places, percentages variable against total contract, aggregate allocation cannot exceed 100%, payments cannot overpay. History is append-only.

Roles: manager, secretary, accountant, architect, civil_engineer, draftsman, municipality_draftsman, site_supervisor, client. Engineers see assigned projects only when eligible; accountant sees financial scope. Manager controls each client's project visibility and download permission. Client never writes engineering or financial data. Disabled accounts and password reset revoke sessions; first issued password must be changed. No public account signup.

WAHA adapter stays server-only. Persist queue/outbox in the same transaction as business changes; job runner claims with skip locked and leases, retries exponential backoff, uncertain sends are not blindly resent. Global and per-client/per-event controls; templates; respect client visibility at dispatch time. Signed HMAC webhooks, replay protection, session status and delivery acknowledgements. No messages to real recipients in tests.

## Verification and operational boundary

Run meaningful domain and integration tests, DB authorization isolation tests, lint, typecheck, production build and Playwright against the production server at mobile/desktop. Verify real database persistence. Keep generated bootstrap credentials in ignored files, never reports or chat. A deployment guide and environment template must identify external WAHA host/key/webhook secret, pairing and authenticated cron, HTTPS and backups. Do not claim a live WAHA connection or deployment until observed. Do not publish or send unsolicited external messages.
