# WhatsApp operations

## Current Render deployment

The live provider is maintained in the sibling `../waha` folder and private repository [modern-waha](https://github.com/MohamedAbdelmaksoud97/modern-waha), branch `codex/waha-render`. Render automatically deploys that branch to the Free service [modern-waha](https://dashboard.render.com/web/srv-dbtfvsbbc2fs73f3ecrg). Its cheap public keep-alive route is `https://modern-waha.onrender.com/healthz`; `/api/*` requires the private API key.

Production Vercel settings point to this provider with session `default` and matching API/webhook secrets. Global notifications are enabled; event templates, project visibility and client preferences still apply. Native WAHA tables exist in PostgreSQL and the application client has retrieved a real pairing QR. No phone has been paired and real delivery remains unverified.

The provider repository includes `google-apps-script/Code.gs` and its manifest. Set `WAHA_HEALTH_URL`, `MODERN_CRON_URL` and `CRON_SECRET` in Script Properties, then run `installKeepAlive` once. The resulting ten-minute trigger must be verified in the Google account; source code alone does not schedule it. Keep secrets outside Git.

To pair, open WhatsApp management as a manager, select Start session then Pairing QR, and scan with the office phone. If an unscanned QR expires, Start session now restarts the failed provider session automatically.

The application uses WAHA's server API. No WhatsApp account has been connected and no real messages were sent during implementation. Without a valid `WAHA_URL` and `WAHA_API_KEY`, the manager status API reports `not_configured`. Provider availability and WhatsApp pairing are external prerequisites.

## Provision and pair

1. Choose and review a pinned WAHA image version/digest. Copy `deployment/waha.env.example` to `deployment/waha.env`, keep it out of source control, and generate independent random API, webhook and cron secrets. The compose file requires actual values and binds the provider port to localhost. The deployment uses NOWEB to reduce memory usage for a single office session. Check the pinned release's engine support before upgrading.
2. Run `npm run whatsapp:storage:setup`, then `docker compose --env-file deployment/waha.env -f deployment/compose.waha.yml up -d --build`. Session data lives in dedicated PostgreSQL databases, so the deployment does not require a persistent Docker or Render disk. Back up those databases securely. Pairing credentials grant access to the linked WhatsApp account. Dashboard/Swagger access remains disabled.
3. Set `WAHA_URL`, `WAHA_API_KEY`, `WAHA_SESSION`, `WAHA_WEBHOOK_SECRET` and `CRON_SECRET` in the Next.js server environment. Use a private network or HTTPS authenticated reverse proxy if WAHA runs on another host. The browser never receives provider credentials or a configurable provider URL. The loopback bind requires a private tunnel/proxy when the app is on another host.
4. Set the provider webhook URL to the application's HTTPS `/api/webhooks/waha`. Its HMAC key must equal `WAHA_WEBHOOK_SECRET`. Subscribe to `session.status` and `message.ack`. Global webhook environment settings are supplied in compose; confirm existing sessions inherit those settings or configure their session webhook settings explicitly. The manager start action does not overwrite an existing session's webhook configuration.
5. A manager who has changed their issued password starts the session, requests its QR code and scans it from WhatsApp's Linked devices on the intended office phone. QR codes expire; request a fresh QR when necessary. The manager status must actually report `WORKING` before dispatch. GET status never creates or starts a session.
6. Review templates and each client's visibility/preferences before enabling global dispatch. Phone numbers require an explicit international country code. No country code is guessed. The deployment starts with dispatch disabled in the database.
7. Configure a trusted scheduler to call GET or POST `/api/cron/notifications` every minute with `Authorization: Bearer <CRON_SECRET>`. Do not put that secret in a URL/query string. The route authenticates with a timing-safe comparison and processes at most ten messages per run. Configure hosting timeout to at least 120 seconds and HTTPS. Rate limiting is stored in Postgres.

Run `npm run db:migrate` to apply the ordered application migrations. They create the queue and delivery receipt tables inside the private `modern` schema.

## PostgreSQL session persistence

`npm run whatsapp:storage:setup` uses the administrator connection in
`SUPABASE_DB_URL` to provision the dedicated `modern_waha` login and the
`waha_modern` / `waha_modern_default` databases. The administrator password is not
passed to WAHA. The generated `WHATSAPP_SESSIONS_POSTGRESQL_URL` is written only
to ignored `deployment/waha.env`. Use the session pooler on port 5432; native
WAHA storage uses multiple databases, session-local state and temporary tables.

The dedicated role owns its WAHA databases and has database-creation permission
required by WAHA's native session lifecycle. It cannot inherit the office role,
bypass RLS, manage other roles or read the private `modern` schema. PUBLIC access
is revoked from the two provisioned databases. Setup verifies a real
write/disconnect/reconnect/read round trip, removes its own probe table, and
checks office-data isolation. It does not claim a phone session exists before
the manager pairs the phone.

WAHA initializes its own tables on first startup. Do not add them to the office
migration runner or expose them through the browser/Data API. Keep
`WAHA_NAMESPACE=modern` and `WAHA_SESSION_NAMESPACE=modern` stable after pairing.
Switching an existing session to another engine requires explicit migration or
pairing again.

The pinned vendor PostgreSQL URL parser disables certificate verification by
default. `deployment/waha.Dockerfile` uses a guarded build-time patch to require
verification, includes the project's CA bundle, and sets `PGSSLMODE=verify-full`
for downstream engine connections. The image build fails if the expected vendor
code changes, so an upstream update requires review.

## Render Free deployment

Use `deployment/render.waha.yaml` as the Render Blueprint path. It requests one
Free web service and no disk or paid database. Fill its three secret fields from
the privately prepared environment: `WHATSAPP_SESSIONS_POSTGRESQL_URL`,
`WAHA_API_KEY`, and `WHATSAPP_HOOK_HMAC_KEY` (the latter matches the application's
`WAHA_WEBHOOK_SECRET`). The callback targets
`https://modern-alpha-rose.vercel.app/api/webhooks/waha`.

After deployment, configure the resulting HTTPS URL as `WAHA_URL` on Vercel,
along with matching API/webhook secrets and `WAHA_SESSION=default`, then redeploy
the application and pair the phone. Google Apps Script keep-alive requests and
notification-job requests are separate scheduling operations; keep-alive alone
does not dispatch office notifications. Render Free can restart or suspend, so
verify reconnect after a Render restart before relying on it. PostgreSQL
persistence removes dependence on Render's local filesystem, not Free-tier
availability limits.

## Queue and privacy behavior

Business changes enqueue notifications within their transaction; WAHA is called later. A unique business deduplication key prevents duplicate outbox entries. Workers claim with `FOR UPDATE SKIP LOCKED` and a two-minute token lease, then check ownership and re-read current project visibility, client destination, global settings and client event preferences immediately before sending. Settings/preference edits serialize with dispatch; project row locks serialize visibility changes. Messages contain only the client name, project code and selected event. Templates accept `{client_name}`, `{project_code}` and `{event}`; other substitutions are rejected. Stored outbox bodies are not trusted as message templates or sent directly.

Every event requires visible project status. Payment, municipality and supervision events additionally require their corresponding visibility flag. File notifications check the category on the matching upload audit record. If the category is hidden or cannot be verified, the queue cancels the message. A cancelled notification stays cancelled even if visibility later changes.

An HTTP success requires a provider message ID. Definite HTTP rejection is `failed`; rate limiting retries with bounded exponential backoff (up to five attempts). An ambiguous network failure, timeout, 5xx response, malformed success response, or process death with an expired sending lease becomes `uncertain`. It is never automatically or manually retried by the API. WAHA `sendText` does not provide an application-level exactly-once contract; a lost HTTP response cannot prove whether delivery occurred. Review uncertain deliveries against provider records before resolving operationally. Successful `sent`, `delivered` and `read` records cannot be retried or downgraded by delayed acknowledgements.

Webhooks verify SHA512 over exact raw bytes before JSON parsing, reject wrong-length signatures safely, restrict the configured session, limit body size, and deduplicate the signed envelope ID. The signed timestamp has a seven-day retry window and five-minute future tolerance. Only minimal receipt IDs/ACK levels are retained. Acknowledgements arriving before the HTTP response are reconciled under a provider-message advisory lock. Session status updates use the signed event time to avoid stale events replacing newer status. Monitor queue failures/uncertain records and provider availability; do not enable automatic resends of uncertain messages.

## Verification

Run `node --conditions=react-server --import tsx --test tests/whatsapp.test.ts` for isolated tests. `WHATSAPP_DB_TEST=1 node --conditions=react-server --import tsx --test tests/whatsapp.integration.test.ts` runs against the configured database with a localhost fake provider. It creates/removes test fixtures, temporarily snapshots/restores global notification settings, and limits dispatch to its test job IDs. Run that test with an exclusive notification-settings maintenance window. It never calls a real provider or WhatsApp recipient.

References checked during implementation: [WAHA sessions](https://waha.devlike.pro/docs/how-to/sessions/), [sending text](https://waha.devlike.pro/docs/how-to/send-messages/), [webhook events and HMAC](https://waha.devlike.pro/docs/how-to/events/), [provider security](https://waha.devlike.pro/docs/how-to/security/). Verify image-specific API behavior against the installed provider's OpenAPI before enabling live delivery.
