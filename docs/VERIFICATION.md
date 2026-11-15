# Modern platform verification

Local verification used the production Next.js standalone build and the configured Supabase Postgres database. The public website defaults to Arabic RTL. English LTR and light/dark preferences are available in the public site, sign-in, office workspace and client portal.

| Check | Result |
| --- | --- |
| Next.js production build and standalone runtime | Build succeeded. Readiness returned HTTP 200 against Postgres. |
| TypeScript and ESLint | Passed. Generated Playwright reports and local credentials are excluded from lint. |
| Database migrations | The migration runner verified all 11 migrations against the configured database. It uses a transaction lock and commits schema changes with the migration journal. |
| Backend | 9 tests passed. Coverage includes real database isolation, stage eligibility, changed roles, required outputs and correction cycles, forced password change, secretary permissions, financial precision and upload validation. |
| WhatsApp | 10 tests passed with local HTTP and Postgres. Coverage includes signed webhooks, replay protection, queue deduplication, opt-out, visibility and ambiguous delivery. The live manager API reported `not_configured`. Client access to the manager API returned 403. |
| Playwright Chromium | 13 tests passed in one run on the standalone production server. The scoped cleanup then removed the test projects, accounts, files, published portfolio entry and consultation. |
| Runtime dependencies | `npm audit --omit=dev` reported zero advisories. Some lint and shadcn CLI development dependencies have upstream advisories. |
| Docker manifests | Both Compose YAML files parsed. The Windows test host did not have Docker, so the image was not built on this host. |

Playwright covers public content, both languages and appearance preferences, mobile navigation, consultation, login, password rotation, manager data entry, the full workflow through municipal return and closure, document and report access, KWD balances, client isolation, publication and office routes on a narrow viewport.

The operator needs a production Node host with HTTPS and a verified backup policy. The WhatsApp connection needs a reachable WAHA instance, secrets, an authenticated scheduler and pairing with the office phone. Live WhatsApp delivery and deployment to the office's hosting infrastructure remain unverified. See [deployment instructions](DEPLOYMENT.md) and [WAHA operations](WAHA.md).
