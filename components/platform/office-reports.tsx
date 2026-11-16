"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  officeReportLabels,
  type OfficeReport,
  type ReportPage,
  type ReportColumn,
  type ReportRow,
  type LedgerData,
} from "@/lib/accounting-types";
import { stageLabels } from "@/lib/types";
import { ActionForm, NoData, SelectField, TextField } from "./forms";
import { BrandedSheet, officeMoney, PrintButton } from "./office-print";
import { englishStages, usePreferences } from "./preferences";
import { usePlatform } from "./provider";
import { kindNames } from "./office-accounting-forms";

function ReportTable({
  columns,
  rows,
  totals,
  print = false,
}: {
  columns: ReportColumn[];
  rows: ReportRow[];
  totals?: ReportRow;
  print?: boolean;
}) {
  const { t, locale } = usePreferences();
  const cells = (row: ReportRow) =>
    row.cells.map((value, i) => {
      if (value == null) return "—";
      const format = columns[i].format;
      if (format === "money")
        return (
          <bdi key={i} className="tabular-nums">
            {officeMoney(value)}
          </bdi>
        );
      if (format === "stage")
        return (
          (locale === "ar" ? stageLabels : englishStages)[Number(value)] ??
          value
        );
      if (format === "state" && kindNames[String(value)])
        return t(...kindNames[String(value)]);
      return value;
    });
  return (
    <div
      className={print ? undefined : "office-branded-document overflow-x-auto"}
    >
      <table>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} scope="col">
                {t(col.ar, col.en)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {cells(row).map((cell, j) => (
                <td key={j}>
                  {!print && j === 0 && row.href ? (
                    <Link className="text-link underline" href={row.href}>
                      {cell}
                    </Link>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr>
              {cells(totals).map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

type Shown = {
  data: ReportPage;
  kind: OfficeReport;
  from: string;
  to: string;
  entityLabel: string;
};
const financial = [
  "summary",
  "income",
  "position",
  "trial",
  "journal",
  "cash",
  "receivables",
  "payables",
  "client",
  "vendor",
  "profitability",
] as const;
const operational = [
  "projects",
  "municipality",
  "visits",
  "team",
  "inquiries",
] as const;
export function OfficeReports() {
  const { t, locale } = usePreferences(),
    { data: platform } = usePlatform(),
    params = useSearchParams();
  const requested = params.get("kind");
  const initial =
    requested && Object.hasOwn(officeReportLabels, requested)
      ? (requested as OfficeReport)
      : "summary";
  return (
    <ReportWorkspace
      key={locale + "|" + params.toString()}
      initial={initial}
      initialEntity={params.get("entity") ?? undefined}
      fromParam={params.get("from") ?? undefined}
      toParam={params.get("to") ?? undefined}
      locale={locale}
      t={t}
      platform={platform}
    />
  );
}
function ReportWorkspace({
  initial,
  initialEntity,
  fromParam,
  toParam,
  locale,
  t,
  platform,
}: {
  initial: OfficeReport;
  initialEntity?: string;
  fromParam?: string;
  toParam?: string;
  locale: "ar" | "en";
  t: (ar: string, en?: string) => string;
  platform: ReturnType<typeof usePlatform>["data"];
}) {
  const [kind, setKind] = useState<OfficeReport>(initial),
    [shown, setShown] = useState<Shown>();
  const [lookups, setLookups] =
    useState<Pick<LedgerData, "accounts" | "vendors">>();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuwait",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/accounting?lookups=1", {
      cache: "no-store",
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setLookups({ accounts: data.accounts, vendors: data.vendors });
        }
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);
  const picks =
    kind === "journal" || kind === "cash"
      ? (lookups?.accounts ?? [])
          .filter((a) => kind !== "cash" || ["cash", "bank"].includes(a.kind))
          .map((a) => ({
            value: a.code,
            label: a.code + " · " + (locale === "ar" ? a.name_ar : a.name_en),
          }))
      : kind === "receivables" || kind === "client"
        ? platform.clients.map((c) => ({ value: c.id, label: c.name }))
        : kind === "payables" || kind === "vendor"
          ? (lookups?.vendors ?? []).map((v) => ({
              value: v.id,
              label: v.name,
            }))
          : ["profitability", "projects", "municipality", "visits"].includes(
                kind,
              )
            ? platform.projects.map((p) => ({ value: p.id, label: p.name }))
            : kind === "team"
              ? platform.users
                  .filter((u) => u.role !== "client")
                  .map((u) => ({ value: u.id, label: u.name }))
              : null;
  const required = kind === "client" || kind === "vendor";
  const label = (k: OfficeReport) =>
    t(officeReportLabels[k][0], officeReportLabels[k][1]);
  const renderPrint = shown && (
    <BrandedSheet
      identity={shown.data.identity}
      title={label(shown.kind)}
      subtitle={
        <>
          <bdi dir="ltr">
            {shown.from} — {shown.to}
          </bdi>
          {shown.entityLabel && <> · {shown.entityLabel}</>}
        </>
      }
    >
      <ReportTable
        columns={shown.data.columns}
        rows={shown.data.rows}
        totals={shown.data.totals}
        print
      />
      {!shown.data.rows.length && (
        <p>{t("لا توجد بيانات للفترة", "No data for the period")}</p>
      )}
      {shown.data.comparison && (
        <>
          <h2>
            {t("الفترة السابقة", "Previous period")}{" "}
            <bdi dir="ltr">
              {shown.data.comparison.from} — {shown.data.comparison.to}
            </bdi>
          </h2>
          <ReportTable
            columns={shown.data.columns}
            rows={shown.data.comparison.rows}
            totals={shown.data.comparison.totals}
            print
          />
        </>
      )}
    </BrandedSheet>
  );
  const withPeriod = (row: ReportRow) => {
    if (!row.href?.startsWith("/workspace/reports?") || !shown) return row;
    return {
      ...row,
      href: row.href + "&from=" + shown.from + "&to=" + shown.to,
    };
  };
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-3xl font-medium">
        {t("التقارير", "Reports")}
      </h1>
      <section className="app-panel">
        <ActionForm
          submitLabel={t("عرض التقرير", "Run report")}
          onSubmit={async (f) => {
            const from = String(f.get("from")),
              to = String(f.get("to")),
              entity = String(f.get("entity") ?? "");
            const query = new URLSearchParams({
              kind,
              from,
              to,
              locale,
              compare: f.has("compare") ? "1" : "0",
            });
            if (entity && entity !== "all") query.set("entity", entity);
            try {
              const r = await fetch("/api/office-reports?" + query, {
                cache: "no-store",
              });
              const json = await r.json();
              if (!r.ok) return { ok: false, error: json.error };
              setShown({
                data: json,
                kind,
                from,
                to,
                entityLabel:
                  picks?.find((p) => p.value === entity)?.label ?? "",
              });
              return { ok: true };
            } catch {
              return {
                ok: false,
                error: t("تعذر تحميل التقرير", "Unable to load report"),
              };
            }
          }}
        >
          <label className="grid max-w-md gap-1 text-sm">
            {t("نوع التقرير", "Report type")}
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as OfficeReport)}
              className="h-11 rounded-sm border border-input bg-background px-3"
            >
              {[
                [financial, t("الحسابات", "Accounting")],
                [operational, t("تشغيل المكتب", "Office operations")],
              ].map(([types, label]) => (
                <optgroup key={String(label)} label={String(label)}>
                  {(types as readonly OfficeReport[]).map((k) => (
                    <option key={k} value={k}>
                      {t(officeReportLabels[k][0], officeReportLabels[k][1])}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              type="date"
              name="from"
              label={t("من تاريخ", "From date")}
              defaultValue={fromParam ?? today.slice(0, 7) + "-01"}
              required
            />
            <TextField
              type="date"
              name="to"
              label={t("إلى تاريخ", "To date")}
              defaultValue={toParam ?? today}
              required
            />
          </div>
          {picks && (
            <SelectField
              key={kind + String(Boolean(lookups))}
              name="entity"
              label={t("تصفية حسب السجل", "Filter by record")}
              options={
                required
                  ? picks
                  : [{ value: "all", label: t("الكل", "All") }, ...picks]
              }
              defaultValue={
                kind === initial && initialEntity
                  ? initialEntity
                  : required
                    ? undefined
                    : "all"
              }
            />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="compare" />{" "}
            {t(
              "إظهار الفترة السابقة بنفس المدة",
              "Show the preceding period of equal length",
            )}
          </label>
        </ActionForm>
      </section>
      {shown && (
        <section className="app-panel space-y-4">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2>{label(shown.kind)}</h2>
              <p className="text-sm text-muted-foreground" dir="ltr">
                {shown.from} — {shown.to}
              </p>
              {shown.entityLabel && <p>{shown.entityLabel}</p>}
            </div>
            <PrintButton>{renderPrint}</PrintButton>
          </header>
          {shown.data.rows.length || shown.data.totals ? (
            <ReportTable
              columns={shown.data.columns}
              rows={shown.data.rows.map(withPeriod)}
              totals={shown.data.totals}
            />
          ) : (
            <NoData
              title={t("لا توجد بيانات للفترة", "No data for the period")}
            />
          )}
          {shown.data.comparison && (
            <>
              <h2>
                {t("الفترة السابقة", "Previous period")}{" "}
                <bdi dir="ltr">
                  {shown.data.comparison.from} — {shown.data.comparison.to}
                </bdi>
              </h2>
              <ReportTable
                columns={shown.data.columns}
                rows={shown.data.comparison.rows}
                totals={shown.data.comparison.totals}
              />
            </>
          )}
        </section>
      )}
    </section>
  );
}
