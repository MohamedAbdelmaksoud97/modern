"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import type {
  LedgerData,
  LedgerDocument,
  Vendor,
} from "@/lib/accounting-types";
import { ErrorNotice, FormDialog, NoData } from "./forms";
import { usePlatform } from "./provider";
import { usePreferences } from "./preferences";
import {
  BasicBookForm,
  InvoiceForm,
  JournalForm,
  MovementForm,
  ReconcileForm,
  SettlementForm,
  kindNames,
  type BookCommand,
} from "./office-accounting-forms";
import {
  InvoiceSheet,
  invoiceStatus,
  officeMoney,
  PrintButton,
} from "./office-print";

const actionNames = {
  start: ["بدء الدفتر", "Open ledger"],
  close_period: ["إقفال فترة", "Close period"],
  save_identity: ["بيانات المكتب والطباعة", "Office and print identity"],
  create_account: ["إضافة حساب", "Add account"],
  save_vendor: ["بيانات المورد", "Supplier details"],
  credit: ["إشعار دائن", "Credit note"],
  reverse: ["عكس القيد", "Reverse entry"],
  issue_document: ["اعتماد الفاتورة", "Issue invoice"],
  cancel_draft: ["إلغاء المسودة", "Cancel draft"],
  sale: ["فاتورة عميل", "Customer invoice"],
  purchase: ["فاتورة مورد", "Supplier bill"],
  receipt: ["سند قبض", "Customer receipt"],
  apply_advance: ["توزيع دفعة مقدمة", "Apply advance"],
  vendor_payment: ["سداد مورد", "Supplier payment"],
  expense: ["مصروف مباشر", "Direct expense"],
  transfer: ["تحويل بين الحسابات", "Transfer between accounts"],
  payroll: ["قيد رواتب إجمالي", "Post payroll total"],
  refund: ["رد دفعة مقدمة", "Refund advance"],
  opening: ["قيد افتتاحي", "Opening entry"],
  adjustment: ["قيد تسوية", "Adjustment entry"],
  reconcile: ["مطابقة كشف الحساب", "Reconcile statement"],
  view: ["عرض الفاتورة", "View invoice"],
} as const;
type Action = keyof typeof actionNames;
type Dialog = {
  action: Action;
  id?: string;
  document?: LedgerDocument;
  vendor?: Vendor;
};

function Money({ value }: { value: string | number }) {
  return (
    <bdi className="tabular-nums whitespace-nowrap">{officeMoney(value)}</bdi>
  );
}
function DocumentTable({
  docs,
  open,
  manager,
  readOnly = false,
}: {
  docs: LedgerDocument[];
  open: (d: Dialog) => void;
  manager: boolean;
  readOnly?: boolean;
}) {
  const { t } = usePreferences();
  return docs.length ? (
    <Table>
      <TableHeader>
        <TableRow>
          {[
            t("الفاتورة", "Invoice"),
            t("العميل أو المورد", "Customer or supplier"),
            t("الاستحقاق", "Due date"),
            t("الحالة", "Status"),
            t("الإجمالي د.ك", "Total KWD"),
            t("المستحق د.ك", "Outstanding KWD"),
            t("الإجراءات", "Actions"),
          ].map((label) => (
            <TableHead key={label}>{label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {docs.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell>
              <bdi>{doc.number ?? "—"}</bdi>
            </TableCell>
            <TableCell>
              {doc.party_name}
              {doc.project_name && (
                <p className="text-xs text-muted-foreground">
                  {doc.project_name}
                </p>
              )}
            </TableCell>
            <TableCell>
              <bdi>{doc.due_date}</bdi>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{invoiceStatus(doc, t)}</Badge>
            </TableCell>
            <TableCell>
              <Money value={doc.total} />
            </TableCell>
            <TableCell>
              <Money value={doc.status === "posted" ? doc.outstanding : "0"} />
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {!readOnly &&
                  doc.status === "draft" &&
                  (!doc.opening || manager) && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          open({ action: doc.direction, document: doc })
                        }
                      >
                        {t("تعديل", "Edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          open({ action: "issue_document", id: doc.id })
                        }
                      >
                        {t("اعتماد", "Issue")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          open({ action: "cancel_draft", id: doc.id })
                        }
                      >
                        {t("إلغاء المسودة", "Cancel draft")}
                      </Button>
                    </>
                  )}
                {doc.office_snapshot && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => open({ action: "view", document: doc })}
                  >
                    {t("عرض الفاتورة", "View invoice")}
                  </Button>
                )}
                {!readOnly &&
                  doc.status === "posted" &&
                  Number(doc.outstanding) > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => open({ action: "credit", id: doc.id })}
                    >
                      {t("إشعار دائن", "Credit note")}
                    </Button>
                  )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ) : (
    <NoData title={t("لا توجد فواتير", "No invoices")} />
  );
}

export function OfficeAccounting() {
  const { t, locale } = usePreferences(),
    { data: platform, notify, refresh } = usePlatform(),
    params = useSearchParams();
  const manager = platform.user.role === "manager";
  const [data, setData] = useState<LedgerData>(),
    [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null),
    [dismissed, setDismissed] = useState(false);
  const [journalFilter, setJournalFilter] = useState("all"),
    [docFilter, setDocFilter] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/accounting", { cache: "no-store" });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      setData(value);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل دفتر الحسابات");
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const command: BookCommand = async (action, payload = {}) => {
    try {
      const response = await fetch("/api/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const result = await response.json();
      if (result.ok) {
        await Promise.all([load(), refresh()]);
        notify(t("تم حفظ التغييرات بنجاح", "Changes saved"));
      }
      return result;
    } catch {
      return {
        ok: false,
        error: t("تعذر الاتصال بالخادم", "Unable to connect to the server"),
      };
    }
  };
  if (!data)
    return (
      <section className="app-panel">
        <ErrorNotice error={error} />
        {error ? (
          <Button variant="outline" onClick={() => void load()}>
            {t("إعادة المحاولة", "Try again")}
          </Button>
        ) : (
          <p>{t("جارٍ تحميل الحسابات…", "Loading accounts…")}</p>
        )}
      </section>
    );
  const active = Boolean(data.opening_date);
  const directDoc =
    !dismissed && params.get("document")
      ? data.documents.find(
          (d) => d.id === params.get("document") && d.office_snapshot,
        )
      : undefined;
  const current =
    dialog ??
    (directDoc ? ({ action: "view", document: directDoc } as Dialog) : null);
  const close = () => {
    setDialog(null);
    if (directDoc) setDismissed(true);
  };
  const formProps = { data, command, close };
  const button = (action: Action, primary = false) => (
    <Button
      key={action}
      type="button"
      variant={primary ? "default" : "outline"}
      onClick={() => setDialog({ action })}
    >
      {t(actionNames[action][0], actionNames[action][1])}
    </Button>
  );
  const liquidity = data.accounts.filter(
    (a) => a.kind === "bank" || a.kind === "cash",
  );
  const balances = [
    [
      t("الخزائن والبنوك", "Cash and bank"),
      liquidity.reduce((sum, a) => sum + Number(a.balance), 0),
    ],
    [
      t("ذمم العملاء", "Receivables"),
      Number(data.accounts.find((a) => a.kind === "receivable")?.balance ?? 0),
    ],
    [
      t("ذمم الموردين", "Payables"),
      -Number(data.accounts.find((a) => a.kind === "payable")?.balance ?? 0),
    ],
    [
      t("مقدمات العملاء", "Customer advances"),
      -Number(data.accounts.find((a) => a.kind === "advance")?.balance ?? 0),
    ],
  ] as const;
  const documents = data.documents.filter((d) =>
    [d.number, d.party_name, d.project_name, d.external_ref]
      .map((v) => v ?? "")
      .join(" ")
      .toLowerCase()
      .includes(docFilter.toLowerCase()),
  );
  const names = new Map(
    data.accounts.map((a) => [a.code, locale === "ar" ? a.name_ar : a.name_en]),
  );
  const tab = params.get("tab") === "documents" ? "documents" : "overview";
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-medium">
          {t("حسابات المكتب", "Office accounting")}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/workspace/finance" />}
          >
            {t("مالية المشروعات", "Project finances")}
          </Button>
          {manager && (
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/workspace/reports" />}
            >
              {t("التقارير", "Reports")}
            </Button>
          )}
        </div>
      </header>
      <ErrorNotice error={error} />
      {!active && (
        <section className="app-panel flex flex-col items-start gap-3">
          <h2>{t("افتتاح الدفتر", "Open the ledger")}</h2>
          <p>
            {t(
              "حدد تاريخ البداية بعد مطابقة الأرصدة الافتتاحية. من وقت فتح الدفتر، التحصيل الجديد يتسجل هنا.",
              "Set an opening date after reconciling opening balances. Once opened, new receipts are recorded here.",
            )}
          </p>
          {manager && button("start", true)}
        </section>
      )}
      <Tabs defaultValue={tab} className="min-w-0">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview">
            {t("ملخص الحسابات", "Overview")}
          </TabsTrigger>
          <TabsTrigger value="documents">
            {t("الفواتير والتحصيل", "Invoices and collections")}
          </TabsTrigger>
          <TabsTrigger value="vendors">
            {t("الموردون", "Suppliers")}
          </TabsTrigger>
          <TabsTrigger value="cash">
            {t("الخزائن والبنوك", "Cash and bank")}
          </TabsTrigger>
          <TabsTrigger value="journal">
            {t("دفتر اليومية", "Journal")}
          </TabsTrigger>
          {manager && (
            <TabsTrigger value="settings">
              {t("الإعدادات", "Settings")}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {balances.map(([label, value]) => (
              <div className="app-panel" key={label}>
                <h2>{label}</h2>
                <p className="mt-2 text-2xl">
                  <Money value={value} />{" "}
                  <span className="text-sm">{t("د.ك", "KWD")}</span>
                </p>
              </div>
            ))}
          </div>
          <section className="app-panel">
            <h2>{t("دليل الحسابات", "Chart of accounts")}</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    t("الرمز", "Code"),
                    t("الحساب", "Account"),
                    t("النوع", "Type"),
                    t("الرصيد د.ك", "Balance KWD"),
                  ].map((s) => (
                    <TableHead key={s}>{s}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.accounts.map((a) => (
                  <TableRow key={a.code}>
                    <TableCell>
                      <bdi>{a.code}</bdi>
                    </TableCell>
                    <TableCell>{names.get(a.code)}</TableCell>
                    <TableCell>{t(...kindNames[a.kind])}</TableCell>
                    <TableCell>
                      <Money value={a.balance} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>
        <TabsContent value="documents" className="space-y-4 pt-4">
          {active && (
            <div className="flex flex-wrap gap-2">
              {button("sale", true)}
              {button("receipt")}
              {button("apply_advance")}
            </div>
          )}
          <label className="grid max-w-sm gap-1 text-sm">
            {t("بحث عن فاتورة", "Search invoices")}
            <input
              className="h-10 border border-input bg-background px-3"
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value)}
            />
          </label>
          <DocumentTable
            docs={documents.filter((d) => d.direction === "sale")}
            open={setDialog}
            manager={manager}
          />
          {data.advances.length > 0 && (
            <section className="app-panel">
              <h2>
                {t("الدفعات المقدّمة المتاحة", "Available customer advances")}
              </h2>
              <ul className="mt-3 grid gap-2">
                {data.advances.map((a) => (
                  <li key={a.client_id}>
                    {platform.clients.find((c) => c.id === a.client_id)?.name} ·{" "}
                    <Money value={a.balance} /> {t("د.ك", "KWD")}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </TabsContent>
        <TabsContent value="vendors" className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2">
            {button("save_vendor")}
            {active && (
              <>
                {button("purchase", true)}
                {button("vendor_payment")}
              </>
            )}
          </div>
          <section className="app-panel">
            <h2>{t("دليل الموردين", "Supplier directory")}</h2>
            <ul className="mt-3 grid gap-2">
              {data.vendors.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setDialog({ action: "save_vendor", vendor: v })
                    }
                  >
                    {v.name}
                  </Button>
                  <bdi>{v.phone}</bdi> <bdi>{v.email}</bdi>
                </li>
              ))}
            </ul>
          </section>
          <DocumentTable
            docs={documents.filter((d) => d.direction === "purchase")}
            open={setDialog}
            manager={manager}
          />
        </TabsContent>
        <TabsContent value="cash" className="space-y-4 pt-4">
          {active && (
            <div className="flex flex-wrap gap-2">
              {button("expense", true)}
              {button("transfer")}
              {button("payroll")}
              {button("reconcile")}
              {manager && button("refund")}
            </div>
          )}
          <section className="app-panel">
            <h2>{t("حسابات النقد", "Cash accounts")}</h2>
            <ul className="mt-3 grid gap-2">
              {liquidity.map((a) => {
                const pending = data.entries
                  .flatMap((e) => e.lines)
                  .filter(
                    (l) => l.account_code === a.code && !l.reconciliation_id,
                  ).length;
                return (
                  <li key={a.code}>
                    {names.get(a.code)} · <Money value={a.balance} />{" "}
                    {t("د.ك", "KWD")} · {pending}{" "}
                    {t("حركة غير مطابقة", "unreconciled movements")}
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="app-panel">
            <h2>{t("سجل المطابقات", "Reconciliation history")}</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    t("الحساب", "Account"),
                    t("تاريخ الكشف", "Statement date"),
                    t("رصيد الدفتر", "Book balance"),
                    t("رصيد الكشف", "Statement balance"),
                    t("المطابق", "Cleared"),
                    t("فرق الكشف والمطابق", "Statement vs cleared"),
                    t("ملاحظات", "Notes"),
                  ].map((s) => (
                    <TableHead key={s}>{s}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.reconciliations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{names.get(r.account_code)}</TableCell>
                    <TableCell>
                      <bdi>{r.statement_date}</bdi>
                    </TableCell>
                    {[
                      r.book_balance,
                      r.statement_balance,
                      r.cleared_balance,
                      Number(r.statement_balance) - Number(r.cleared_balance),
                    ].map((v, i) => (
                      <TableCell key={i}>
                        <Money value={v} />
                      </TableCell>
                    ))}
                    <TableCell>{r.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>
        <TabsContent value="journal" className="space-y-4 pt-4">
          {active && manager && (
            <div className="flex flex-wrap gap-2">
              {button("opening")}
              {button("adjustment")}
            </div>
          )}
          <label className="grid max-w-sm gap-1 text-sm">
            {t("تصفية حسب الحساب", "Filter by account")}
            <select
              className="h-10 border border-input bg-background px-3"
              value={journalFilter}
              onChange={(e) => setJournalFilter(e.target.value)}
            >
              <option value="all">{t("كل الحسابات", "All accounts")}</option>
              {data.accounts.map((a) => (
                <option key={a.code} value={a.code}>
                  {names.get(a.code)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3">
            {data.entries
              .filter(
                (e) =>
                  journalFilter === "all" ||
                  e.lines.some((l) => l.account_code === journalFilter),
              )
              .map((e) => (
                <details key={e.id} className="app-panel">
                  <summary className="cursor-pointer">
                    <bdi>
                      #{e.entry_no} · {e.accounting_date}
                    </bdi>{" "}
                    · {t(...(kindNames[e.kind] ?? [e.kind, e.kind]))} ·{" "}
                    {e.description}
                    {e.reversed && (
                      <Badge className="ms-2" variant="outline">
                        {t("معكوس", "Reversed")}
                      </Badge>
                    )}
                  </summary>
                  {e.reference && (
                    <p className="mt-2">
                      {t("المرجع", "Reference")} <bdi>{e.reference}</bdi>
                    </p>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("الحساب", "Account")}</TableHead>
                        <TableHead>{t("مدين", "Debit")}</TableHead>
                        <TableHead>{t("دائن", "Credit")}</TableHead>
                        <TableHead>{t("المشروع", "Project")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {e.lines.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>{names.get(l.account_code)}</TableCell>
                          <TableCell>
                            {Number(l.amount) > 0 ? (
                              <Money value={l.amount} />
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {Number(l.amount) < 0 ? (
                              <Money value={l.amount.slice(1)} />
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {platform.projects.find(
                              (p) => p.id === l.project_id,
                            )?.name ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {manager && !e.reversed && !e.reverses_id && (
                    <Button
                      variant="outline"
                      onClick={() => setDialog({ action: "reverse", id: e.id })}
                    >
                      {t(...actionNames.reverse)}
                    </Button>
                  )}
                </details>
              ))}
          </div>
        </TabsContent>
        {manager && (
          <TabsContent value="settings" className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-2">
              {button("save_identity")}
              {button("create_account")}
              {active && button("close_period")}
            </div>
            <section className="app-panel grid gap-2">
              <p>
                {t("تاريخ بداية الدفتر", "Opening date")}{" "}
                <bdi>{data.opening_date ?? "—"}</bdi>
              </p>
              <p>
                {t("مقفل حتى", "Closed through")}{" "}
                <bdi>{data.closed_through ?? "—"}</bdi>
              </p>
            </section>
          </TabsContent>
        )}
      </Tabs>
      <FormDialog
        open={Boolean(current)}
        title={
          current
            ? t(actionNames[current.action][0], actionNames[current.action][1])
            : ""
        }
        onOpenChange={(v) => {
          if (!v) close();
        }}
      >
        {current &&
          (current.action === "view" ? (
            current.document && (
              <>
                <PrintButton>
                  <InvoiceSheet doc={current.document} />
                </PrintButton>
                <InvoiceSheet doc={current.document} />
              </>
            )
          ) : current.action === "sale" || current.action === "purchase" ? (
            <InvoiceForm
              {...formProps}
              direction={current.action}
              initial={current.document}
            />
          ) : current.action === "receipt" ||
            current.action === "apply_advance" ||
            current.action === "vendor_payment" ? (
            <SettlementForm {...formProps} kind={current.action} />
          ) : current.action === "expense" ||
            current.action === "transfer" ||
            current.action === "payroll" ||
            current.action === "refund" ? (
            <MovementForm {...formProps} kind={current.action} />
          ) : current.action === "opening" ||
            current.action === "adjustment" ? (
            <JournalForm {...formProps} kind={current.action} />
          ) : current.action === "reconcile" ? (
            <ReconcileForm {...formProps} />
          ) : (
            <BasicBookForm
              {...formProps}
              kind={current.action}
              target={current.id}
              vendor={current.vendor}
            />
          ))}
      </FormDialog>
    </section>
  );
}

export function PortalInvoices({ project }: { project: string }) {
  const { t } = usePreferences();
  const [docs, setDocs] = useState<LedgerDocument[]>(),
    [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LedgerDocument>();
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/accounting?project=" + encodeURIComponent(project), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        const value = await r.json();
        if (!r.ok) throw new Error(value.error);
        setDocs(value.documents);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(t("تعذر تحميل الفواتير", "Unable to load invoices"));
      });
    return () => controller.abort();
  }, [project, t]);
  return (
    <section className="app-panel space-y-3">
      <h2>{t("الفواتير المعتمدة", "Issued invoices")}</h2>
      <ErrorNotice error={error} />
      {docs?.length ? (
        <DocumentTable
          docs={docs}
          open={(d) => setSelected(d.document)}
          manager={false}
          readOnly
        />
      ) : (
        <p>
          {docs
            ? t("لا توجد فواتير مشتركة", "No shared invoices")
            : error
              ? null
              : t("جارٍ تحميل الفواتير…", "Loading invoices…")}
        </p>
      )}
      <FormDialog
        open={Boolean(selected)}
        title={t("عرض الفاتورة", "View invoice")}
        onOpenChange={(v) => {
          if (!v) setSelected(undefined);
        }}
      >
        {selected && (
          <>
            <PrintButton>
              <InvoiceSheet doc={selected} />
            </PrintButton>
            <InvoiceSheet doc={selected} />
          </>
        )}
      </FormDialog>
    </section>
  );
}
