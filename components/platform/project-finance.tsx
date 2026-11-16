"use client";
import { useState } from "react";
import {
  Plus,
  Wallet,
  ReceiptText,
  Percent,
  FileText,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { type Project } from "@/lib/types";
import { usePlatform } from "./provider";
import { usePreferences } from "./preferences";
import { useLabels } from "./projects";
import {
  ActionForm,
  FormDialog,
  TextField,
  AreaField,
  NoData,
  formObject,
  money,
  date,
  SelectField,
} from "./forms";
export function ProjectFinance({
  project,
  portal = false,
}: {
  project: Project;
  portal?: boolean;
}) {
  const { data, command } = usePlatform(),
    { t } = usePreferences(),
    { stages } = useLabels(),
    [modal, setModal] = useState<string | null>(null);
  const quotations = data.quotations.filter((q) => q.project_id === project.id),
    payments = data.payments.filter((q) => q.project_id === project.id),
    allocations = data.allocations.filter((q) => q.project_id === project.id);
  const total = Number(project.contract_value || 0),
    paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const canQuote = ["manager", "secretary"].includes(data.user.role),
    canFinance = ["manager", "secretary", "accountant"].includes(
      data.user.role,
    ),
    canPay = ["manager", "accountant"].includes(data.user.role);
  const visible = (key: string) =>
    !portal ||
    !!project.visibility?.[key as keyof NonNullable<Project["visibility"]>];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-medium">
          {t("مالية المشروع", "Project finances")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {!portal && canQuote && (
            <Button variant="outline" onClick={() => setModal("quote")}>
              <FileText data-icon="inline-start" />
              {t("عرض سعر جديد", "New quotation")}
            </Button>
          )}
          {!portal && canFinance && (
            <>
              <Button variant="outline" onClick={() => setModal("allocation")}>
                <Percent data-icon="inline-start" />
                {t("توزيع النسب", "Allocate percentages")}
              </Button>
              {canPay && (
                <Button onClick={() => setModal("payment")}>
                  <Plus data-icon="inline-start" />
                  {t("تسجيل دفعة", "Record payment")}
                </Button>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="no-print px-0!"
            aria-label={t("طباعة المالية", "Print finances")}
            onClick={() => window.print()}
          >
            <Printer />
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {visible("quotation") && (
          <div className="app-panel">
            <Wallet className="mb-4 size-5 text-link" />
            <p className="text-xs text-muted-foreground">
              {t("قيمة التعاقد", "Contract value")}
            </p>
            <p className="mt-3 text-xl">{money(project.contract_value)}</p>
          </div>
        )}
        {visible("payments") && (
          <div className="app-panel">
            <ReceiptText className="mb-4 size-5 text-success" />
            <p className="text-xs text-muted-foreground">
              {t("إجمالي المسدد", "Total paid")}
            </p>
            <p className="mt-3 text-xl">{money(paid)}</p>
          </div>
        )}
        {visible("balance") && (
          <div className="app-panel">
            <Wallet className="mb-4 size-5 text-warning" />
            <p className="text-xs text-muted-foreground">
              {t("المبلغ المتبقي", "Outstanding balance")}
            </p>
            <p className="mt-3 text-xl">
              {money(portal ? project.balance : total - paid)}
            </p>
          </div>
        )}
      </div>
      {visible("payment_schedule") && (
        <section className="app-panel">
          <h3 className="mb-5 text-lg">
            {t(
              "توزيع قيمة التعاقد على المراحل",
              "Contract allocation by stage",
            )}
          </h3>
          {allocations.length ? (
            <div className="data-table-wrap">
              <Table aria-label={t("جدول الدفعات", "Payment schedule")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("المرحلة", "Stage")}</TableHead>
                    <TableHead>{t("النسبة", "Percentage")}</TableHead>
                    <TableHead>{t("القيمة", "Amount")}</TableHead>
                    <TableHead>{t("الاستحقاق", "Due date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{stages[a.stage]}</TableCell>
                      <TableCell>{a.percentage}%</TableCell>
                      <TableCell>
                        {money(
                          a.amount ?? (total * Number(a.percentage)) / 100,
                        )}
                      </TableCell>
                      <TableCell>{date(a.due_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <NoData
              title={t(
                "لم توزع نسب التعاقد بعد",
                "No contract allocations yet",
              )}
              description={t(
                "تحدد الحسابات نسب المراحل من إجمالي التعاقد.",
                "Accounting determines each stage's percentage of the total contract.",
              )}
            />
          )}
        </section>
      )}
      {visible("payments") && (
        <section className="app-panel">
          <h3 className="mb-5 text-lg">
            {t("الدفعات المسددة", "Recorded payments")}
          </h3>
          {payments.length ? (
            <div className="data-table-wrap">
              <Table aria-label={t("الدفعات المسددة", "Recorded payments")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("التاريخ", "Date")}</TableHead>
                    <TableHead>{t("المبلغ", "Amount")}</TableHead>
                    <TableHead>{t("المرجع", "Reference")}</TableHead>
                    <TableHead>{t("الملاحظات", "Notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{date(p.paid_at)}</TableCell>
                      <TableCell>{money(p.amount)}</TableCell>
                      <TableCell>{p.reference}</TableCell>
                      <TableCell className="max-w-xs whitespace-normal">
                        {p.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <NoData title={t("لا توجد دفعات مسجلة", "No payments recorded")} />
          )}
        </section>
      )}
      {visible("quotation") && quotations.length > 0 && (
        <section className="app-panel">
          <h3 className="mb-5 text-lg">
            {t("إصدارات عروض الأسعار", "Quotation revisions")}
          </h3>
          {quotations.map((q) => (
            <div
              key={q.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b py-4 last:border-0"
            >
              <div>
                <p className="text-sm">
                  {t("عرض سعر — إصدار", "Quotation — revision")} {q.version}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {date(q.created_at)} · {q.notes}
                </p>
              </div>
              <p className="font-medium">{money(q.amount)}</p>
            </div>
          ))}
        </section>
      )}
      <FormDialog
        open={modal === "quote"}
        onOpenChange={(o) => {
          if (!o) setModal(null);
        }}
        title={t("عرض سعر جديد", "New quotation")}
        description={t(
          "سيُحفظ إصدار جديد، وتُحدّث قيمة التعاقد مع الحفاظ على الإصدارات السابقة.",
          "A new revision will be saved and the contract value updated. Previous revisions are retained.",
        )}
      >
        <ActionForm
          onSubmit={(f) =>
            command("create_quotation", {
              ...formObject(f),
              project_id: project.id,
            })
          }
          onSuccess={() => setModal(null)}
        >
          <TextField
            label={t("القيمة الإجمالية (د.ك)", "Total amount (KWD)")}
            name="amount"
            type="number"
            min="0.001"
            step="0.001"
            required
          />
          <AreaField
            label={t("ملاحظات العرض", "Quotation notes")}
            name="notes"
            maxLength={4000}
          />
        </ActionForm>
      </FormDialog>
      <FormDialog
        open={modal === "payment"}
        onOpenChange={(o) => {
          if (!o) setModal(null);
        }}
        title={t("تسجيل دفعة", "Record payment")}
      >
        <ActionForm
          onSubmit={(f) =>
            command("create_payment", {
              ...formObject(f),
              project_id: project.id,
            })
          }
          onSuccess={() => setModal(null)}
        >
          <TextField
            label={t("المبلغ (د.ك)", "Amount (KWD)")}
            name="amount"
            type="number"
            min="0.001"
            step="0.001"
            max={Math.max(0, total - paid)}
            required
          />
          <TextField
            label={t("تاريخ السداد", "Payment date")}
            name="paid_at"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
          <TextField
            label={t(
              "رقم الإيصال أو مرجع العملية",
              "Receipt or transaction reference",
            )}
            name="reference"
            required
            maxLength={160}
          />
          <AreaField
            label={t("الملاحظات", "Notes")}
            name="notes"
            maxLength={2000}
          />
        </ActionForm>
      </FormDialog>
      <FormDialog
        open={modal === "allocation"}
        onOpenChange={(o) => {
          if (!o) setModal(null);
        }}
        title={t("توزيع نسب المراحل", "Stage percentage allocations")}
        description={t(
          "النسب من إجمالي قيمة التعاقد. يجب ألا يتجاوز المجموع 100٪.",
          "Percentages are based on the total contract value. Their sum must not exceed 100%.",
        )}
      >
        <ActionForm
          onSubmit={(f) =>
            command("set_allocations", {
              project_id: project.id,
              allocations: stages
                .map((_, stage) => ({
                  stage,
                  percentage: String(f.get(`percentage_${stage}`) || 0),
                  due_date: String(f.get(`due_${stage}`) || ""),
                }))
                .filter((a) => Number(a.percentage) > 0),
            })
          }
          onSuccess={() => setModal(null)}
        >
          <div className="flex flex-col gap-4">
            {stages.slice(0, 9).map((s, i) => (
              <div
                key={s}
                className="grid grid-cols-1 items-center gap-3 border-b pb-4 sm:grid-cols-[minmax(0,1fr)_112px]"
              >
                <div className="flex flex-col gap-2">
                  <span className="text-sm">{s}</span>
                  <TextField
                    label={t("تاريخ الاستحقاق", "Due date")}
                    name={`due_${i}`}
                    type="date"
                    defaultValue={
                      allocations
                        .find((a) => a.stage === i)
                        ?.due_date?.slice(0, 10) || ""
                    }
                  />
                </div>
                <TextField
                  label="%"
                  name={`percentage_${i}`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.001"
                  defaultValue={
                    allocations.find((a) => a.stage === i)?.percentage || "0"
                  }
                />
              </div>
            ))}
          </div>
        </ActionForm>
      </FormDialog>
    </div>
  );
}
export function Finance() {
  const { data } = usePlatform(),
    { t } = usePreferences(),
    [id, setId] = useState(data.projects[0]?.id || "");
  const project = data.projects.find((p) => p.id === id);
  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="section-label mb-2">{t("الحسابات", "ACCOUNTING")}</p>
        <h1 className="text-3xl font-medium">{t("المالية وعروض الأسعار")}</h1>
      </div>
      <div className="max-w-md">
        <SelectField
          label={t("المشروع", "Project")}
          name="project_finance"
          defaultValue={id}
          options={data.projects.map((p) => ({
            value: p.id,
            label: `${p.code} · ${p.name}`,
          }))}
          onChange={setId}
        />
      </div>
      {project ? (
        <ProjectFinance key={project.id} project={project} />
      ) : (
        <NoData
          title={t(
            "أضف مشروعًا لبدء الإدارة المالية",
            "Add a project to start managing finances",
          )}
        />
      )}
    </div>
  );
}
