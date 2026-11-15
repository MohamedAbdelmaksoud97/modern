"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  RefreshCw,
  MessageCircle,
  QrCode,
  Send,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { usePlatform } from "./provider";
import { usePreferences } from "./preferences";
import {
  ActionForm,
  AreaField,
  ErrorNotice,
  NoData,
  FormDialog,
  date,
} from "./forms";
type Settings = {
  configured: boolean;
  status: string;
  enabled: boolean;
  events: Record<string, boolean>;
  templates: Record<string, string>;
};
export const notificationEvents: Record<string, [string, string]> = {
  project_created: ["إنشاء مشروع", "Project created"],
  stage_changed: ["تغيير المرحلة", "Stage changed"],
  document_uploaded: ["رفع مستند", "Document uploaded"],
  payment_recorded: ["تسجيل دفعة", "Payment recorded"],
  municipality_decision: ["قرار البلدية", "Municipality decision"],
  supervision_report: ["تقرير إشراف", "Site report"],
  project_completed: ["اكتمال المشروع", "Project completed"],
};
const statusCopy: Record<string, [string, string]> = {
  not_configured: ["غير مُعدّ", "Not configured"],
  WORKING: ["متصل", "Connected"],
  STOPPED: ["متوقف", "Stopped"],
  STARTING: ["جارٍ الاتصال", "Starting"],
  SCAN_QR_CODE: ["بانتظار مسح الرمز", "Scan QR to connect"],
  FAILED: ["تعذر الاتصال", "Connection failed"],
  unknown: ["حالة غير معروفة", "Unknown status"],
  queued: ["في الانتظار", "Queued"],
  pending: ["في الانتظار", "Pending"],
  sending: ["جارٍ الإرسال", "Sending"],
  sent: ["مرسلة", "Sent"],
  delivered: ["تم التسليم", "Delivered"],
  read: ["مقروءة", "Read"],
  failed: ["فشلت", "Failed"],
  uncertain: ["تحتاج مراجعة", "Needs review"],
  cancelled: ["ملغاة", "Cancelled"],
  suppressed: ["موقوفة بالصلاحيات", "Suppressed by preferences"],
};
export function WhatsApp() {
  const { data, refresh, notify } = usePlatform(),
    { t } = usePreferences(),
    [settings, setSettings] = useState<Settings | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [qr, setQr] = useState("");
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSettings(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection error");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(action: string, payload: Record<string, unknown> = {}) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok)
        throw new Error(result.error || t("تعذر إتمام العملية"));
      if (result.qr) setQr(result.qr);
      await load();
      await refresh();
      notify(t("تم تحديث إعدادات واتساب", "WhatsApp settings updated"));
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("تعذر الاتصال بالخادم");
      setError(message);
      return { ok: false, error: message };
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label mb-2">
            {t("تواصل يُبقي الصورة واضحة", "KEEP CLIENTS INFORMED")}
          </p>
          <h1 className="text-3xl font-medium">{t("إدارة واتساب")}</h1>
        </div>
        <Button variant="outline" disabled={busy} onClick={() => void load()}>
          <RefreshCw data-icon="inline-start" />
          {t("تحديث الاتصال", "Refresh connection")}
        </Button>
      </div>
      <ErrorNotice error={error} />
      {settings ? (
        <>
          <section className="app-panel">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center bg-accent text-link">
                  <MessageCircle className="size-6" />
                </div>
                <div>
                  <h2>{t("حالة الربط", "Connection status")}</h2>
                  <div className="mt-3">
                    <Badge variant="secondary">
                      {statusCopy[settings.status]
                        ? t(...statusCopy[settings.status])
                        : settings.status}
                    </Badge>
                  </div>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                    {settings.configured
                      ? t(
                          "تُرسل الإشعارات وفق الصلاحيات وإعدادات كل عميل. فشل الاتصال لا يوقف العمل على المشروعات.",
                          "Notifications respect project visibility and each client's preferences. Provider outages do not interrupt project work.",
                        )
                      : t(
                          "لم تُضبط بيانات مزود واتساب على الخادم بعد. اضبط عنوان WAHA والمفتاح السري ثم اربط هاتف المكتب.",
                          "WhatsApp provider credentials are not configured on the server. Configure the WAHA URL and API key, then pair the office phone.",
                        )}
                  </p>
                </div>
              </div>
              {settings.configured && (
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy} onClick={() => void action("start")}>
                    {t("بدء الربط", "Start session")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void action("qr")}
                  >
                    <QrCode data-icon="inline-start" />
                    {t("رمز الربط", "Pairing QR")}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void action("restart")}
                  >
                    {t("إعادة الاتصال", "Restart session")}
                  </Button>
                </div>
              )}
            </div>
          </section>
          <Tabs defaultValue="settings">
            <TabsList className="mb-6 flex h-auto flex-wrap">
              <TabsTrigger value="settings">
                {t("الإعدادات والقوالب", "Settings & templates")}
              </TabsTrigger>
              <TabsTrigger value="clients">
                {t("إشعارات العملاء", "Client preferences")}
              </TabsTrigger>
              <TabsTrigger value="history">
                {t("سجل الرسائل", "Message history")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="settings">
              <section className="app-panel">
                <ActionForm
                  onSubmit={(f) =>
                    action("save_settings", {
                      enabled: settings.enabled,
                      events: settings.events,
                      templates: Object.fromEntries(
                        Object.keys(notificationEvents).map((k) => [
                          k,
                          String(f.get(`template_${k}`) || ""),
                        ]),
                      ),
                    })
                  }
                >
                  <Field
                    orientation="horizontal"
                    className="justify-between border-b pb-5"
                  >
                    <FieldLabel htmlFor="wa-enabled">
                      {t(
                        "تفعيل الإشعارات تلقائيًا",
                        "Enable automatic notifications",
                      )}
                    </FieldLabel>
                    <Switch
                      id="wa-enabled"
                      checked={settings.enabled}
                      onCheckedChange={(v) =>
                        setSettings((s) => (s ? { ...s, enabled: v } : s))
                      }
                    />
                  </Field>
                  <p className="text-xs leading-7 text-muted-foreground">
                    {t(
                      "متغيرات القوالب المدعومة:",
                      "Supported template variables:",
                    )}{" "}
                    <bdi className="font-mono">
                      {"{client_name} · {project_code} · {event}"}
                    </bdi>
                  </p>
                  <div className="grid gap-6 xl:grid-cols-2">
                    {Object.entries(notificationEvents).map(([key, labels]) => (
                      <div key={key} className="flex flex-col gap-4 border p-5">
                        <Field
                          orientation="horizontal"
                          className="justify-between"
                        >
                          <FieldLabel htmlFor={`wa-event-${key}`}>
                            {t(...labels)}
                          </FieldLabel>
                          <Switch
                            id={`wa-event-${key}`}
                            checked={!!settings.events[key]}
                            onCheckedChange={(v) =>
                              setSettings((s) =>
                                s
                                  ? { ...s, events: { ...s.events, [key]: v } }
                                  : s,
                              )
                            }
                          />
                        </Field>
                        <AreaField
                          label={t("قالب الرسالة", "Message template")}
                          name={`template_${key}`}
                          defaultValue={settings.templates[key]}
                          required
                          maxLength={2000}
                        />
                      </div>
                    ))}
                  </div>
                </ActionForm>
              </section>
            </TabsContent>
            <TabsContent value="clients">
              <div className="flex flex-col gap-4">
                {data.clients.length ? (
                  data.clients.map((client) => {
                    const preference = data.notification_preferences.find(
                      (p) => p.client_id === client.id,
                    );
                    return (
                      <ClientPreference
                        key={`${client.id}-${JSON.stringify(preference)}`}
                        id={client.id}
                        name={client.name}
                        enabled={preference?.enabled ?? false}
                        events={preference?.events || {}}
                        save={(payload) => action("save_preference", payload)}
                      />
                    );
                  })
                ) : (
                  <NoData title={t("لا يوجد عملاء بعد", "No clients yet")} />
                )}
              </div>
            </TabsContent>
            <TabsContent value="history">
              <section className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                    {t(
                      "الرسائل ذات الحالة غير المؤكدة تحتاج مراجعة لتجنب الإرسال المكرر. يُعاد إرسال حالات الفشل المؤكد فقط.",
                      "Uncertain messages require review to prevent duplicates. Only definitively failed messages can be retried.",
                    )}
                  </p>
                  <Button
                    variant="outline"
                    disabled={!settings.configured || busy}
                    onClick={() => void action("dispatch")}
                  >
                    <Send data-icon="inline-start" />
                    {t("معالجة قائمة الانتظار", "Process queue")}
                  </Button>
                </div>
                {data.notifications.length ? (
                  <div className="data-table-wrap">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("العميل", "Client")}</TableHead>
                          <TableHead>{t("الحدث", "Event")}</TableHead>
                          <TableHead>{t("الحالة", "Status")}</TableHead>
                          <TableHead>{t("المحاولات", "Attempts")}</TableHead>
                          <TableHead>{t("التاريخ", "Date")}</TableHead>
                          <TableHead>{t("الإجراء", "Action")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.notifications.map((n) => (
                          <TableRow key={n.id}>
                            <TableCell>
                              {data.clients.find((c) => c.id === n.client_id)
                                ?.name || "—"}
                            </TableCell>
                            <TableCell>
                              {notificationEvents[n.event]
                                ? t(...notificationEvents[n.event])
                                : n.event}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {statusCopy[n.status]
                                  ? t(...statusCopy[n.status])
                                  : n.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{n.attempts}</TableCell>
                            <TableCell>{date(n.created_at)}</TableCell>
                            <TableCell>
                              {n.status === "failed" && (
                                <Button
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() =>
                                    void action("retry", { id: n.id })
                                  }
                                >
                                  <RotateCcw data-icon="inline-start" />
                                  {t("إعادة المحاولة")}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <NoData
                    title={t("لا توجد رسائل مسجلة", "No messages recorded")}
                  />
                )}
              </section>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <p className="text-muted-foreground">
          {t("جارٍ تحميل إعدادات واتساب…", "Loading WhatsApp settings…")}
        </p>
      )}
      <FormDialog
        open={!!qr}
        onOpenChange={(o) => {
          if (!o) setQr("");
        }}
        title={t("ربط هاتف المكتب", "Pair the office phone")}
        description={t(
          "افتح واتساب على هاتف المكتب، ثم الأجهزة المرتبطة، وامسح الرمز. الرمز مؤقت؛ اطلب رمزًا جديدًا إذا انتهت صلاحيته.",
          "Open WhatsApp on the office phone, go to Linked devices, and scan this code. Codes expire; request a new one if needed.",
        )}
      >
        {qr && (
          <Image
            src={qr}
            alt={t("رمز ربط واتساب", "WhatsApp pairing code")}
            width={320}
            height={320}
            unoptimized
            className="mx-auto bg-white p-4"
          />
        )}
      </FormDialog>
    </div>
  );
}
function ClientPreference({
  id,
  name,
  enabled: initialEnabled,
  events: initialEvents,
  save,
}: {
  id: string;
  name: string;
  enabled: boolean;
  events: Record<string, boolean>;
  save: (
    p: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const { t } = usePreferences(),
    [enabled, setEnabled] = useState(initialEnabled),
    [events, setEvents] = useState(initialEvents);
  return (
    <section className="app-panel">
      <h2 className="mb-5">{name}</h2>
      <ActionForm onSubmit={() => save({ client_id: id, enabled, events })}>
        <Field
          orientation="horizontal"
          className="justify-between border-b pb-4"
        >
          <FieldLabel htmlFor={`client-wa-${id}`}>
            {t(
              "تفعيل إشعارات هذا العميل",
              "Enable notifications for this client",
            )}
          </FieldLabel>
          <Switch
            id={`client-wa-${id}`}
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </Field>
        <div className="grid gap-x-8 md:grid-cols-2">
          {Object.entries(notificationEvents).map(([key, labels]) => (
            <Field
              key={key}
              orientation="horizontal"
              className="justify-between border-b py-3"
            >
              <FieldLabel htmlFor={`${id}-${key}`} className="text-sm">
                {t(...labels)}
              </FieldLabel>
              <Switch
                id={`${id}-${key}`}
                checked={events[key] !== false}
                onCheckedChange={(v) => setEvents((p) => ({ ...p, [key]: v }))}
              />
            </Field>
          ))}
        </div>
      </ActionForm>
    </section>
  );
}
