// Durable work is held in Postgres. This process only triggers authenticated jobs.
import { setTimeout as wait } from "node:timers/promises";
const target = process.env.NOTIFICATION_WORKER_URL;
const secret = process.env.CRON_SECRET;
if (!target || !secret || secret.length < 32)
  throw new Error(
    "Configure NOTIFICATION_WORKER_URL and a CRON_SECRET of at least 32 characters.",
  );
const url = new URL(target);
if (
  !["http:", "https:"].includes(url.protocol) ||
  url.pathname !== "/api/cron/notifications"
)
  throw new Error("Invalid notification worker target.");
const abort = new AbortController();
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => abort.abort());
while (!abort.signal.aborted) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(125000)]),
    });
    if (!response.ok)
      console.error(`Notification job returned HTTP ${response.status}`);
  } catch (error) {
    if (!abort.signal.aborted)
      console.error(
        `Notification job unavailable: ${error instanceof Error ? error.name : "unknown"}`,
      );
  }
  try {
    await wait(60000, undefined, { signal: abort.signal });
  } catch {}
}
