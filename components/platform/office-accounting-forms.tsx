"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import type {
  LedgerData,
  LedgerDocument,
  Vendor,
} from "@/lib/accounting-types";
import type { CommandResult } from "@/lib/types";
import { ActionForm, AreaField, SelectField, TextField } from "./forms";
import { officeMoney } from "./office-print";
import { usePlatform } from "./provider";
import { englishStages, usePreferences } from "./preferences";
import { stageLabels } from "@/lib/types";

export type BookCommand = (
  action: string,
  payload?: Record<string, unknown>,
) => Promise<CommandResult>;
type Props = { data: LedgerData; command: BookCommand; close: () => void };
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuwait",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const str = (form: FormData, key: string) => String(form.get(key) ?? "");
const option = (form: FormData, key: string) => {
  const v = str(form, key);
  return v && v !== "none" ? v : null;
};
const values = (form: FormData) => Object.fromEntries(form.entries());
const accountKinds = [
  "cash",
  "bank",
  "asset",
  "liability",
  "equity",
  "income",
  "expense",
] as const;
export const kindNames: Record<string, [string, string]> = {
  cash: ["خزنة", "Cash"],
  bank: ["بنك", "Bank"],
  asset: ["أصل", "Asset"],
  liability: ["التزام", "Liability"],
  equity: ["حقوق ملكية", "Equity"],
  income: ["إيراد", "Income"],
  expense: ["مصروف", "Expense"],
  receivable: ["ذمم العملاء", "Receivables"],
  payable: ["ذمم الموردين", "Payables"],
  advance: ["مقدمات", "Advances"],
  opening: ["رصيد افتتاحي", "Opening balance"],
  invoice: ["فاتورة عميل", "Customer invoice"],
  vendor_bill: ["فاتورة مورد", "Supplier bill"],
  receipt: ["سند قبض", "Receipt"],
  allocation: ["توزيع تحصيل", "Receipt allocation"],
  vendor_payment: ["سداد مورد", "Supplier payment"],
  transfer: ["تحويل", "Transfer"],
  payroll: ["رواتب وأجور", "Payroll"],
  adjustment: ["تسوية", "Adjustment"],
  credit: ["إشعار دائن", "Credit note"],
  reversal: ["قيد عكسي", "Reversal"],
  refund: ["رد دفعة مقدمة", "Advance refund"],
  matched: ["مطابقة", "Reconciled"],
  unmatched: ["غير مطابقة", "Unreconciled"],
  current: ["غير متأخرة", "Current"],
  approved: ["مقبول", "Approved"],
  rejected: ["مرفوض", "Rejected"],
  needs_correction: ["تعديلات مطلوبة", "Needs correction"],
};
export function useBookChoices(data: LedgerData) {
  const { locale, t } = usePreferences();
  const { data: platform } = usePlatform();
  return {
    none: { value: "none", label: t("بدون", "None") },
    clients: platform.clients.map((c) => ({ value: c.id, label: c.name })),
    projects: platform.projects.map((p) => ({ value: p.id, label: p.name })),
    vendors: data.vendors.map((v) => ({ value: v.id, label: v.name })),
    accounts: (kinds?: readonly string[]) =>
      data.accounts
        .filter((a) => !kinds || kinds.includes(a.kind))
        .map((a) => ({
          value: a.code,
          label: a.code + " · " + (locale === "ar" ? a.name_ar : a.name_en),
        })),
  };
}
function BookDate({
  name = "date",
  value,
  label,
}: {
  name?: string;
  value?: string;
  label?: string;
}) {
  const { t } = usePreferences();
  return (
    <TextField
      name={name}
      type="date"
      label={label ?? t("التاريخ المحاسبي", "Accounting date")}
      defaultValue={value ?? today()}
      required
    />
  );
}
function NumberField({
  name = "amount",
  label,
  value,
  signed = false,
  required = true,
}: {
  name?: string;
  label?: string;
  value?: string;
  signed?: boolean;
  required?: boolean;
}) {
  const { t } = usePreferences();
  return (
    <TextField
      name={name}
      label={label ?? t("المبلغ د.ك", "Amount KWD")}
      defaultValue={value}
      inputMode="decimal"
      pattern={(signed ? "-?" : "") + "[0-9]{1,10}([.][0-9]{1,3})?"}
      required={required}
    />
  );
}
function AddLine({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="self-start"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
export function InvoiceForm({
  data,
  command,
  close,
  direction,
  initial,
}: Props & {
  direction: "sale" | "purchase";
  initial?: LedgerDocument;
}) {
  const { t, locale } = usePreferences(),
    { data: platform } = usePlatform(),
    choices = useBookChoices(data);
  const manager = platform.user.role === "manager";
  const sale = direction === "sale";
  const [client, setClient] = useState(initial?.client_id ?? "");
  const [project, setProject] = useState(initial?.project_id ?? "none");
  const [stage, setStage] = useState(
    initial?.allocation_stage == null
      ? "none"
      : String(initial.allocation_stage),
  );
  const [opening, setOpening] = useState(initial?.opening ?? false);
  const [lines, setLines] = useState((initial?.items ?? [{}]).map((_, i) => i));
  const stageOptions = platform.allocations
    .filter((a) => a.project_id === project)
    .map((a) => ({
      value: String(a.stage),
      label:
        (locale === "ar" ? stageLabels : englishStages)[a.stage] +
        " · " +
        officeMoney(a.amount ?? "0"),
    }));
  const projectOptions = platform.projects
    .filter((p) => !sale || p.client_id === client)
    .map((p) => ({ value: p.id, label: p.name }));
  return (
    <ActionForm
      onSuccess={close}
      submitLabel={t("حفظ المسودة", "Save draft")}
      onSubmit={(f) =>
        command("save_document", {
          id: initial?.id,
          direction,
          client_id: sale ? option(f, "client_id") : null,
          vendor_id: sale ? null : option(f, "vendor_id"),
          project_id: option(f, "project_id"),
          allocation_stage:
            sale && stage !== "none" && !opening ? Number(stage) : null,
          account_code: str(f, "account_code"),
          issue_date: str(f, "issue_date"),
          due_date: str(f, "due_date"),
          opening,
          external_ref: str(f, "external_ref"),
          notes: str(f, "notes"),
          items:
            stage !== "none" && !opening
              ? []
              : lines.map((i) => ({
                  description: str(f, "description_" + i),
                  quantity: Number(str(f, "qty_" + i)),
                  price: str(f, "price_" + i),
                })),
        })
      }
    >
      {sale ? (
        <SelectField
          name="client_id"
          label={t("العميل", "Customer")}
          options={choices.clients}
          defaultValue={initial?.client_id ?? undefined}
          onChange={(v) => {
            setClient(v);
            setProject("none");
            setStage("none");
          }}
        />
      ) : (
        <SelectField
          name="vendor_id"
          label={t("المورد", "Supplier")}
          options={choices.vendors}
          defaultValue={initial?.vendor_id ?? undefined}
        />
      )}
      <SelectField
        key={client}
        name="project_id"
        label={t("المشروع (اختياري)", "Project (optional)")}
        options={[choices.none, ...projectOptions]}
        defaultValue={project}
        onChange={(v) => {
          setProject(v);
          setStage("none");
        }}
      />
      {manager && (
        <Field orientation="horizontal">
          <input
            type="checkbox"
            id="invoice-opening"
            checked={opening}
            onChange={(e) => {
              setOpening(e.target.checked);
              setStage("none");
            }}
          />
          <FieldLabel htmlFor="invoice-opening">
            {t(
              "رصيد افتتاحي من معاملة قديمة",
              "Opening balance from an earlier transaction",
            )}
          </FieldLabel>
        </Field>
      )}
      {sale && stageOptions.length > 0 && !opening && (
        <SelectField
          key={project}
          name="allocation_stage"
          label={t("دفعة من العقد", "Contract installment")}
          options={[choices.none, ...stageOptions]}
          defaultValue={stage}
          onChange={setStage}
        />
      )}
      <SelectField
        name="account_code"
        label={
          sale
            ? t("حساب الإيراد", "Revenue account")
            : t("حساب المصروف أو الأصل", "Expense or asset account")
        }
        options={choices.accounts(sale ? ["income"] : ["expense", "asset"])}
        defaultValue={initial?.account_code ?? (sale ? "4000" : "5100")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <BookDate
          key={String(opening)}
          name="issue_date"
          value={
            opening ? (data.opening_date ?? undefined) : initial?.issue_date
          }
          label={t("تاريخ الإصدار", "Issue date")}
        />
        <BookDate
          name="due_date"
          value={initial?.due_date}
          label={t("تاريخ الاستحقاق", "Due date")}
        />
      </div>
      <TextField
        name="external_ref"
        label={t(
          "رقم فاتورة المورد أو المرجع",
          "Supplier invoice number or reference",
        )}
        defaultValue={initial?.external_ref}
        maxLength={500}
      />
      {(stage === "none" || opening) && (
        <>
          {lines.map((i) => (
            <fieldset key={i} className="grid gap-3 border border-border p-3">
              <legend className="px-1 text-sm">
                {t("البند", "Line item")} {lines.indexOf(i) + 1}
              </legend>
              <TextField
                name={"description_" + i}
                label={t("وصف البند", "Line description")}
                defaultValue={initial?.items[i]?.description}
                maxLength={500}
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  name={"qty_" + i}
                  type="number"
                  min={1}
                  max={10000}
                  defaultValue={initial?.items[i]?.quantity ?? 1}
                  label={t("الكمية", "Quantity")}
                  required
                />
                <NumberField
                  name={"price_" + i}
                  label={t("سعر الوحدة د.ك", "Unit price KWD")}
                  value={initial?.items[i]?.price}
                />
              </div>
              {lines.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="self-start"
                  onClick={() => setLines(lines.filter((n) => n !== i))}
                >
                  {t("إزالة البند", "Remove item")}
                </Button>
              )}
            </fieldset>
          ))}
          {lines.length < 60 && (
            <AddLine
              label={t("أضف بندًا", "Add item")}
              onClick={() => setLines([...lines, Math.max(...lines) + 1])}
            />
          )}
        </>
      )}
      <AreaField
        name="notes"
        label={t("ملاحظات تظهر في الفاتورة", "Notes printed on the invoice")}
        defaultValue={initial?.notes}
        maxLength={1000}
      />
    </ActionForm>
  );
}

export function SettlementForm({
  data,
  command,
  close,
  kind,
}: Props & { kind: "receipt" | "apply_advance" | "vendor_payment" }) {
  const { t } = usePreferences(),
    choices = useBookChoices(data);
  const [person, setPerson] = useState("");
  const supplier = kind === "vendor_payment";
  const receipt = kind === "receipt";
  const outstanding = data.documents.filter(
    (d) =>
      d.status === "posted" &&
      Number(d.outstanding) > 0 &&
      (supplier ? d.vendor_id : d.client_id) === person,
  );
  const advance = data.advances.find((a) => a.client_id === person)?.balance;
  return (
    <ActionForm
      onSuccess={close}
      onSubmit={(f) =>
        command(kind, {
          ...values(f),
          items: outstanding.flatMap((d) => {
            const amount = str(f, "invoice_" + d.id).trim();
            return amount && Number(amount) > 0
              ? [{ document_id: d.id, amount }]
              : [];
          }),
        })
      }
    >
      <SelectField
        name={supplier ? "vendor_id" : "client_id"}
        label={supplier ? t("المورد", "Supplier") : t("العميل", "Customer")}
        options={supplier ? choices.vendors : choices.clients}
        onChange={setPerson}
      />
      <BookDate />
      {kind !== "apply_advance" && (
        <SelectField
          name="account"
          label={t("الخزنة أو البنك", "Cash or bank account")}
          options={choices.accounts(["cash", "bank"])}
          defaultValue="1010"
        />
      )}
      {receipt && <NumberField />}
      <TextField
        name="reference"
        label={t("رقم المرجع", "Reference")}
        maxLength={500}
      />
      {!supplier && person && (
        <p>
          {t("رصيد الدفعات المقدمة د.ك", "Available customer advances KWD")}{" "}
          <bdi>{officeMoney(advance ?? "0")}</bdi>
        </p>
      )}
      {person && (
        <fieldset key={person} className="grid gap-3 border border-border p-3">
          <legend className="px-1 text-sm">
            {t("التوزيع على الفواتير", "Invoice allocation")}
          </legend>
          {outstanding.map((d) => (
            <NumberField
              key={d.id}
              name={"invoice_" + d.id}
              label={(d.number ?? "") + " · " + officeMoney(d.outstanding)}
              required={false}
            />
          ))}
          {!outstanding.length && (
            <p>{t("لا توجد فواتير مستحقة", "No open invoices")}</p>
          )}
        </fieldset>
      )}
    </ActionForm>
  );
}

export function MovementForm({
  data,
  command,
  close,
  kind,
}: Props & { kind: "expense" | "transfer" | "payroll" | "refund" }) {
  const { t } = usePreferences(),
    choices = useBookChoices(data);
  const refund = kind === "refund",
    payroll = kind === "payroll",
    transfer = kind === "transfer";
  return (
    <ActionForm
      onSuccess={close}
      onSubmit={(f) =>
        command(kind, {
          ...values(f),
          to: refund ? "2200" : str(f, "to"),
          project_id: option(f, "project_id"),
          client_id: option(f, "client_id"),
        })
      }
    >
      <BookDate />
      <TextField
        name="description"
        label={t("البيان", "Description")}
        maxLength={500}
        required
      />
      <NumberField />
      <SelectField
        name="from"
        label={t("الحساب الدائن", "Credit account")}
        options={choices.accounts(
          payroll ? ["bank", "cash", "liability"] : ["bank", "cash"],
        )}
        defaultValue="1010"
      />
      {refund ? (
        <SelectField
          name="client_id"
          label={t("العميل", "Customer")}
          options={choices.clients}
        />
      ) : (
        <SelectField
          name="to"
          label={t("الحساب المدين", "Debit account")}
          options={choices.accounts(
            transfer ? ["bank", "cash"] : ["expense", "asset"],
          )}
          defaultValue={transfer ? "1020" : payroll ? "5200" : "5100"}
        />
      )}
      {!transfer && !refund && (
        <SelectField
          name="project_id"
          label={t("مشروع (اختياري)", "Project (optional)")}
          options={[choices.none, ...choices.projects]}
          defaultValue="none"
        />
      )}
      <TextField
        name="reference"
        label={t("المرجع", "Reference")}
        maxLength={500}
      />
    </ActionForm>
  );
}

export function JournalForm({
  data,
  command,
  close,
  kind,
}: Props & { kind: "opening" | "adjustment" }) {
  const { t } = usePreferences(),
    choices = useBookChoices(data);
  const [lines, setLines] = useState([0, 1]);
  return (
    <ActionForm
      onSuccess={close}
      onSubmit={(f) => {
        const incomplete = lines.some(
          (i) => Boolean(str(f, "dr_" + i)) === Boolean(str(f, "cr_" + i)),
        );
        if (incomplete)
          return Promise.resolve({
            ok: false,
            error: t(
              "أدخل مدين أو دائن لكل سطر",
              "Enter one debit or credit per row",
            ),
          });
        return command(kind, {
          date: str(f, "date"),
          description: str(f, "description"),
          lines: lines.map((i) => ({
            account: str(f, "account_" + i),
            amount: str(f, "dr_" + i) || "-" + str(f, "cr_" + i),
            client_id: option(f, "client_" + i),
            project_id: option(f, "project_" + i),
          })),
        });
      }}
    >
      <BookDate
        value={
          kind === "opening" ? (data.opening_date ?? undefined) : undefined
        }
      />
      <TextField
        name="description"
        label={t("البيان", "Description")}
        maxLength={500}
        required
      />
      {lines.map((i) => (
        <fieldset key={i} className="grid gap-3 border border-border p-3">
          <legend className="px-1 text-sm">
            {t("سطر القيد", "Journal line")} {lines.indexOf(i) + 1}
          </legend>
          <SelectField
            name={"account_" + i}
            label={t("الحساب", "Account")}
            options={choices.accounts(
              kind === "opening"
                ? ["cash", "bank", "asset", "liability", "equity", "advance"]
                : accountKinds,
            )}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              name={"dr_" + i}
              label={t("مدين د.ك", "Debit KWD")}
              required={false}
            />
            <NumberField
              name={"cr_" + i}
              label={t("دائن د.ك", "Credit KWD")}
              required={false}
            />
          </div>
          {kind === "opening" && (
            <SelectField
              name={"client_" + i}
              label={t("عميل (للمقدمات)", "Customer (for advances)")}
              options={[choices.none, ...choices.clients]}
              defaultValue="none"
            />
          )}
          <SelectField
            name={"project_" + i}
            label={t("مشروع (اختياري)", "Project (optional)")}
            options={[choices.none, ...choices.projects]}
            defaultValue="none"
          />
          {lines.length > 2 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLines(lines.filter((n) => n !== i))}
            >
              {t("إزالة السطر", "Remove line")}
            </Button>
          )}
        </fieldset>
      ))}
      {lines.length < 50 && (
        <AddLine
          label={t("أضف سطرًا", "Add line")}
          onClick={() => setLines([...lines, Math.max(...lines) + 1])}
        />
      )}
    </ActionForm>
  );
}

export function ReconcileForm({ data, command, close }: Props) {
  const { t } = usePreferences(),
    choices = useBookChoices(data);
  const [bank, setBank] = useState("1010"),
    [day, setDay] = useState(today);
  const pending = data.entries.flatMap((e) =>
    e.accounting_date <= day
      ? e.lines
          .filter((l) => l.account_code === bank && !l.reconciliation_id)
          .map((l) => ({ l, e }))
      : [],
  );
  return (
    <ActionForm
      onSuccess={close}
      onSubmit={(f) =>
        command("reconcile", { ...values(f), lines: f.getAll("line") })
      }
    >
      <SelectField
        name="account"
        label={t("الخزنة أو البنك", "Cash or bank account")}
        options={choices.accounts(["cash", "bank"])}
        defaultValue="1010"
        onChange={setBank}
      />
      <TextField
        name="date"
        type="date"
        label={t("تاريخ كشف الحساب", "Statement date")}
        value={day}
        onChange={(e) => setDay(e.currentTarget.value)}
        required
      />
      <NumberField
        name="statement_balance"
        label={t("رصيد الكشف د.ك", "Statement balance KWD")}
        signed
      />
      {pending.length > 0 && (
        <fieldset
          key={bank + day}
          className="grid max-h-64 gap-2 overflow-auto border border-border p-3"
        >
          <legend className="px-1 text-sm">
            {t(
              "الحركات المطابقة لكشف الحساب",
              "Movements confirmed on the statement",
            )}
          </legend>
          {pending.map(({ l, e }) => (
            <Field orientation="horizontal" key={l.id}>
              <input id={l.id} type="checkbox" name="line" value={l.id} />
              <FieldLabel htmlFor={l.id}>
                <bdi>{e.accounting_date}</bdi> · {e.description} ·{" "}
                <bdi>{officeMoney(l.amount)}</bdi>
              </FieldLabel>
            </Field>
          ))}
        </fieldset>
      )}
      <AreaField
        name="notes"
        label={t("ملاحظات المطابقة", "Reconciliation notes")}
        maxLength={1000}
      />
    </ActionForm>
  );
}

export function BasicBookForm({
  data,
  command,
  close,
  kind,
  target,
  vendor,
}: Props & {
  kind:
    | "start"
    | "close_period"
    | "save_identity"
    | "create_account"
    | "save_vendor"
    | "credit"
    | "reverse"
    | "issue_document"
    | "cancel_draft";
  target?: string;
  vendor?: Vendor;
}) {
  const { t } = usePreferences();
  const identityFields = [
    ["name_ar", "اسم المكتب بالعربي", "Office name in Arabic"],
    ["name_en", "اسم المكتب بالإنجليزي", "Office name in English"],
    ["address", "العنوان", "Address"],
    ["phone", "الهاتف", "Phone"],
    ["email", "البريد", "Email"],
    ["registration", "رقم التسجيل", "Registration number"],
    ["payment_instructions", "تعليمات السداد", "Payment instructions"],
  ] as const;
  return (
    <ActionForm
      onSuccess={close}
      onSubmit={(f) =>
        command(kind, { ...values(f), id: target ?? vendor?.id })
      }
    >
      {(kind === "start" ||
        kind === "close_period" ||
        kind === "reverse" ||
        kind === "credit") && (
        <BookDate
          label={
            kind === "start"
              ? t("تاريخ بداية الدفتر", "Ledger opening date")
              : kind === "close_period"
                ? t("إقفال حتى تاريخ", "Close through date")
                : undefined
          }
        />
      )}
      {["close_period", "reverse", "credit"].includes(kind) && (
        <TextField
          name="reason"
          label={t("السبب", "Reason")}
          maxLength={500}
          required
        />
      )}
      {kind === "credit" && <NumberField />}
      {kind === "issue_document" && (
        <p>
          {t(
            "اعتماد الفاتورة يخصص رقمًا ويُرحّل القيد إلى الدفتر.",
            "Issuing the invoice assigns a number and posts its entry.",
          )}
        </p>
      )}
      {kind === "cancel_draft" && (
        <p>
          {t(
            "إلغاء مسودة الفاتورة يمنع اعتمادها.",
            "Cancelling the draft prevents it from being issued.",
          )}
        </p>
      )}
      {kind === "save_identity" &&
        identityFields.map(([key, ar, en]) => (
          <TextField
            key={key}
            name={key}
            label={t(ar, en)}
            defaultValue={data.identity[key]}
            required={key.startsWith("name")}
            maxLength={500}
          />
        ))}
      {kind === "create_account" && (
        <>
          <TextField
            label={t("رمز الحساب", "Account code")}
            name="code"
            inputMode="numeric"
            pattern="[0-9]{4,8}"
            required
          />
          <TextField
            label={t("الاسم بالعربي", "Arabic name")}
            name="name_ar"
            required
            maxLength={500}
          />
          <TextField
            label={t("الاسم بالإنجليزي", "English name")}
            name="name_en"
            required
            maxLength={500}
          />
          <SelectField
            label={t("نوع الحساب", "Account type")}
            name="kind"
            options={accountKinds.map((k) => ({
              value: k,
              label: t(...kindNames[k]),
            }))}
          />
        </>
      )}
      {kind === "save_vendor" && (
        <>
          <TextField
            name="name"
            label={t("اسم المورد", "Supplier name")}
            defaultValue={vendor?.name}
            required
            maxLength={500}
          />
          <TextField
            name="phone"
            label={t("الهاتف", "Phone")}
            defaultValue={vendor?.phone}
            maxLength={100}
          />
          <TextField
            name="email"
            type="email"
            label={t("البريد", "Email")}
            defaultValue={vendor?.email}
            maxLength={300}
          />
          <TextField
            name="reference"
            label={t("مرجع المورد", "Supplier reference")}
            defaultValue={vendor?.reference}
            maxLength={500}
          />
        </>
      )}
    </ActionForm>
  );
}
