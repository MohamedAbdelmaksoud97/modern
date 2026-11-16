import type { PoolClient } from "pg";
import { z } from "zod";
import {
  officeReportLabels,
  type ReportColumn,
  type ReportPage,
  type ReportRow,
} from "@/lib/accounting-types";
import type { User } from "@/lib/types";
import { officeIdentity, officeManager } from "./accounting";
import { withActor } from "./db";
import { AppError } from "./rules";

const queryInput = z.object({
  kind: z.enum(
    Object.keys(officeReportLabels) as [keyof typeof officeReportLabels],
  ),
  from: z.iso.date(),
  to: z.iso.date(),
  locale: z.enum(["ar", "en"]).default("ar"),
  compare: z.enum(["0", "1"]).default("0"),
  entity: z.union([z.uuid(), z.string().regex(/^\d{4,8}$/)]).optional(),
});
type Query = z.output<typeof queryInput>;
type Row = Record<string, string | number | null>;
type Body = Pick<ReportPage, "columns" | "rows" | "totals">;
type Column = ReportColumn & { field: string };
const c = (
  field: string,
  ar: string,
  en: string,
  format?: ReportColumn["format"],
): Column => ({ field, ar, en, format });
const amount = (field: string, ar: string, en: string) =>
  c(field, ar, en, "money");
const day = c("day", "التاريخ", "Date");
const project = c("project", "المشروع", "Project");
const account = c("account", "الحساب", "Account");
const name = c("name", "الاسم", "Name");
const notes = c("notes", "البيان", "Description");
const sum = (values: (string | number | null)[]) => {
  let mills = BigInt(0);
  const factor = BigInt(1000);
  for (const value of values) {
    if (value == null) continue;
    const s = String(value),
      [whole, fraction = ""] = (s[0] === "-" ? s.slice(1) : s).split(".");
    mills +=
      (s[0] === "-" ? BigInt(-1) : BigInt(1)) *
      (BigInt(whole) * factor + BigInt(fraction.padEnd(3, "0").slice(0, 3)));
  }
  const negative = mills < BigInt(0),
    abs = negative ? -mills : mills;
  return (
    (negative ? "-" : "") +
    (abs / factor).toString() +
    "." +
    (abs % factor).toString().padStart(3, "0")
  );
};
function table(
  q: Query,
  defs: Column[],
  rows: Row[],
  totals: string[] = [],
  link?: (r: Row) => string | undefined,
): Body {
  const lines: ReportRow[] = rows.map((r) => ({
    cells: defs.map(({ field }) => r[field] ?? null),
    href: link?.(r),
  }));
  return {
    columns: defs.map(({ ar, en, format }) => ({ ar, en, format })),
    rows: lines,
    ...(totals.length
      ? {
          totals: {
            cells: defs.map(({ field, format }, i) =>
              totals.includes(field)
                ? format === "money"
                  ? sum(rows.map((r) => r[field]))
                  : rows.reduce((n, r) => n + Number(r[field] ?? 0), 0)
                : i === 0
                  ? q.locale === "ar"
                    ? "الإجمالي"
                    : "Total"
                  : null,
            ),
          },
        }
      : {}),
  };
}
const projectLink = (r: Row) =>
  r.project_id ? "/workspace/projects/" + r.project_id : undefined;
const accountsName = (q: Query) =>
  q.locale === "ar" ? "a.name_ar" : "a.name_en";
const tz = " AT TIME ZONE 'Asia/Kuwait'";
const asOfProjects = `
  WITH scoped AS (
    SELECT p.id AS project_id,p.name AS project,p.code,p.created_at,p.due_date,
      coalesce(h.stage,CASE WHEN (p.created_at${tz})::date=$2 THEN p.stage ELSE 0 END) AS stage
    FROM modern.projects p LEFT JOIN LATERAL (
      SELECT CASE a.action WHEN 'transition' THEN (a.details->>'to')::int ELSE (a.details->>'return_stage')::int END AS stage
      FROM modern.audit a
      WHERE a.project_id=p.id AND (a.created_at${tz})::date<=$2 AND
        (a.action='transition' OR (a.action IN ('municipality_decision','closure_decision') AND a.details->>'return_stage' IS NOT NULL))
      ORDER BY a.created_at DESC,a.id DESC LIMIT 1
    ) h ON true WHERE (p.created_at${tz})::date<=$2 AND ($3::uuid IS NULL OR p.id=$3)
  )`;

async function load(cn: PoolClient, q: Query): Promise<Body> {
  const args = [q.from, q.to, q.entity ?? null];
  const accountName = accountsName(q);
  const select = async (sql: string, params: unknown[] = args) =>
    (await cn.query<Row>(sql, params)).rows;
  const ar = q.locale === "ar";
  switch (q.kind) {
    case "summary": {
      const [r] = await select(
        `
        WITH finances AS (
          SELECT coalesce(sum(l.amount) FILTER (WHERE a.kind IN ('cash','bank')),0) cash,
            coalesce(-sum(l.amount) FILTER(WHERE a.kind='income' AND e.accounting_date>=$1),0) income,
            coalesce(sum(l.amount) FILTER(WHERE a.kind='expense' AND e.accounting_date>=$1),0) expense,
            coalesce(sum(l.amount) FILTER(WHERE a.kind='receivable'),0) receivable,
            coalesce(-sum(l.amount) FILTER(WHERE a.kind='payable'),0) payable
          FROM modern.ledger_lines l JOIN modern.ledger_entries e ON e.id=l.entry_id JOIN modern.ledger_accounts a ON a.code=l.account_code WHERE e.accounting_date<=$2
        ) SELECT *,income-expense AS net FROM finances
      `,
        args.slice(0, 2),
      );
      const rows = [
        ["cash", "النقد والبنوك في نهاية الفترة", "Cash & bank at period end"],
        ["income", "إيرادات الفترة", "Period revenue"],
        ["expense", "مصروفات الفترة", "Period expenses"],
        ["net", "صافي نتيجة الفترة", "Period net income"],
        [
          "receivable",
          "ذمم العملاء في نهاية الفترة",
          "Receivables at period end",
        ],
        ["payable", "ذمم الموردين في نهاية الفترة", "Payables at period end"],
      ].map(([field, arName, enName]) => ({
        name: ar ? arName : enName,
        value: r[field],
      }));
      return table(q, [name, amount("value", "القيمة", "Value")], rows);
    }
    case "trial":
    case "income":
    case "position": {
      const rows = await select(
        `
        SELECT a.code,${accountName} AS account,a.kind,
          coalesce(sum(l.amount) FILTER(WHERE e.accounting_date<$1),0)::text AS opening,
          coalesce(sum(l.amount) FILTER(WHERE e.accounting_date>=$1 AND l.amount>0),0)::text AS debit,
          coalesce(-sum(l.amount) FILTER(WHERE e.accounting_date>=$1 AND l.amount<0),0)::text AS credit,
          coalesce(sum(l.amount),0)::text AS closing,
          coalesce(sum(CASE WHEN a.kind='income' THEN -l.amount ELSE l.amount END) FILTER(WHERE e.accounting_date>=$1),0)::text AS period
        FROM modern.ledger_lines l JOIN modern.ledger_entries e ON e.id=l.entry_id JOIN modern.ledger_accounts a ON a.code=l.account_code
        WHERE e.accounting_date<=$2 GROUP BY a.code ORDER BY a.code
      `,
        args.slice(0, 2),
      );
      if (q.kind === "income") {
        const lines = rows.filter((r) =>
          ["income", "expense"].includes(String(r.kind)),
        );
        const net = sum(
          lines.map((r) =>
            r.kind === "income"
              ? r.period
              : String(r.period).startsWith("-")
                ? String(r.period).slice(1)
                : "-" + r.period,
          ),
        );
        return {
          ...table(
            q,
            [
              c("code", "الرمز", "Code"),
              account,
              c("kind", "النوع", "Type", "state"),
              amount("period", "حركة الفترة", "Period activity"),
            ],
            lines,
          ),
          totals: {
            cells: [
              null,
              ar ? "صافي الربح أو الخسارة" : "Net income or loss",
              null,
              net,
            ],
          },
        };
      }
      if (q.kind === "position") {
        const pnl = sum(
          rows
            .filter((r) => ["income", "expense"].includes(String(r.kind)))
            .map((r) => r.closing),
        );
        const split = rows
          .filter((r) => !["income", "expense"].includes(String(r.kind)))
          .map((r) => ({
            ...r,
            assets: ["cash", "bank", "asset", "receivable"].includes(
              String(r.kind),
            )
              ? r.closing
              : null,
            funding: ["payable", "advance", "liability", "equity"].includes(
              String(r.kind),
            )
              ? sum([
                  String(r.closing).startsWith("-")
                    ? String(r.closing).slice(1)
                    : "-" + r.closing,
                ])
              : null,
          }));
        split.push({
          code: "",
          account: ar ? "نتيجة الأعمال المتراكمة" : "Accumulated results",
          kind: "equity",
          assets: null,
          funding: sum([pnl.startsWith("-") ? pnl.slice(1) : "-" + pnl]),
        } as (typeof split)[number]);
        return table(
          q,
          [
            c("code", "الرمز", "Code"),
            account,
            amount("assets", "الأصول", "Assets"),
            amount(
              "funding",
              "الالتزامات وحقوق الملكية",
              "Liabilities and equity",
            ),
          ],
          split,
          ["assets", "funding"],
        );
      }
      return table(
        q,
        [
          c("code", "الرمز", "Code"),
          account,
          amount("opening", "رصيد البداية", "Opening"),
          amount("debit", "مدين الفترة", "Period debits"),
          amount("credit", "دائن الفترة", "Period credits"),
          amount("closing", "صافي النهاية", "Net closing"),
        ],
        rows,
        ["opening", "debit", "credit", "closing"],
        (r) => "/workspace/reports?kind=journal&entity=" + r.code,
      );
    }
    case "journal":
    case "cash": {
      const rows = await select(`
        SELECT e.entry_no::text AS voucher,e.accounting_date::text AS day,${accountName} AS account,
          e.description AS notes,p.name AS project,CASE WHEN l.amount>0 THEN l.amount END::text AS debit,
          CASE WHEN l.amount<0 THEN -l.amount END::text AS credit,
          CASE WHEN r.line_id IS NULL THEN 'unmatched' ELSE 'matched' END AS state
        FROM modern.ledger_entries e JOIN modern.ledger_lines l ON e.id=l.entry_id JOIN modern.ledger_accounts a ON a.code=l.account_code
        LEFT JOIN modern.ledger_reconciled_lines r ON r.line_id=l.id LEFT JOIN modern.projects p ON p.id=l.project_id
        WHERE e.accounting_date BETWEEN $1 AND $2 AND ($3::text IS NULL OR a.code=$3)
        ${q.kind === "cash" ? "AND a.kind IN ('cash','bank')" : ""}
        ORDER BY e.accounting_date,e.entry_no,a.code
      `);
      return table(
        q,
        [
          day,
          c("voucher", "القيد", "Entry"),
          account,
          notes,
          q.kind === "cash"
            ? c("state", "المطابقة", "Reconciliation", "state")
            : project,
          amount(
            "debit",
            q.kind === "cash" ? "داخل" : "مدين",
            q.kind === "cash" ? "In" : "Debit",
          ),
          amount(
            "credit",
            q.kind === "cash" ? "خارج" : "دائن",
            q.kind === "cash" ? "Out" : "Credit",
          ),
        ],
        rows,
        ["debit", "credit"],
      );
    }
    case "receivables":
    case "payables": {
      const rows = await select(
        `
        WITH outstanding AS (
          SELECT d.id,d.project_id,d.party_name AS name,d.number,d.issue_date::text AS day,d.due_date::text AS due,
            ($1::date-d.due_date) AS age,d.total-coalesce(s.applied,0) AS balance
          FROM modern.ledger_documents d
          LEFT JOIN LATERAL (SELECT sum(s.amount) AS applied FROM modern.ledger_settlements s
            JOIN modern.ledger_entries e ON e.id=s.entry_id WHERE s.document_id=d.id AND e.accounting_date<=$1) s ON true
          WHERE d.direction=$2 AND d.entry_id IS NOT NULL AND d.issue_date<=$1
            AND NOT EXISTS (SELECT 1 FROM modern.ledger_entries r WHERE r.reverses_id=d.entry_id AND r.accounting_date<=$1)
            AND ($3::uuid IS NULL OR coalesce(d.client_id,d.vendor_id)=$3)
        )
        SELECT *,greatest(age,0) AS overdue,CASE WHEN age<=0 THEN 'current' WHEN age<=30 THEN '1–30'
          WHEN age<=60 THEN '31–60' WHEN age<=90 THEN '61–90' ELSE '90+' END AS bucket
        FROM outstanding WHERE balance>0 ORDER BY due,number
      `,
        [
          q.to,
          q.kind === "receivables" ? "sale" : "purchase",
          q.entity ?? null,
        ],
      );
      return table(
        q,
        [
          name,
          c("number", "الفاتورة", "Invoice"),
          day,
          c("due", "الاستحقاق", "Due date"),
          c("overdue", "أيام التأخير", "Days late"),
          c("bucket", "الشريحة", "Aging band", "state"),
          amount("balance", "المستحق", "Outstanding"),
        ],
        rows,
        ["balance"],
        (r) => "/workspace/accounting?tab=documents&document=" + r.id,
      );
    }
    case "client":
    case "vendor": {
      const customer = q.kind === "client";
      const defs = [
        day,
        c("voucher", "القيد", "Entry"),
        notes,
        c("reference", "الفواتير والمراجع", "Invoices and references"),
        amount("movement", "صافي الحركة", "Net movement"),
        amount("balance", "الرصيد", "Balance"),
      ];
      if (!q.entity) return table(q, defs, []);
      const rows = await select(
        `
        WITH amounts AS (
          SELECT e.id,e.entry_no,e.accounting_date AS accounting_day,e.description AS notes,e.reference,
            sum(${customer ? "l.amount" : "-l.amount"}) AS movement
          FROM modern.ledger_lines l JOIN modern.ledger_entries e ON e.id=l.entry_id
          WHERE e.accounting_date<=$2 AND ${customer ? "l.client_id" : "l.vendor_id"}=$3
            AND l.account_code IN (${customer ? "'1100','2200'" : "'2100'"})
          GROUP BY e.id
        ), moves AS (
          SELECT a.*,sum(a.movement) OVER (ORDER BY a.accounting_day,a.entry_no) AS balance
          FROM amounts a
        ), statement AS (
          SELECT 1 AS sort,m.entry_no,m.entry_no::text AS voucher,m.accounting_day::text AS day,m.notes,
            coalesce(applied.label,d.number,nullif(m.reference,'')) AS reference,m.movement::text,m.balance::text
          FROM moves m LEFT JOIN modern.ledger_documents d ON d.entry_id=m.id
          LEFT JOIN LATERAL (
            SELECT string_agg(b.number||' ('||s.amount::text||')',', ' ORDER BY b.number) AS label
            FROM modern.ledger_settlements s JOIN modern.ledger_documents b ON b.id=s.document_id WHERE s.entry_id=m.id
          ) applied ON true
          WHERE m.accounting_day>=$1
          UNION ALL
          SELECT 0,0,NULL,$1::date::text,$4,NULL,NULL,coalesce(sum(movement),0)::numeric(18,3)::text
          FROM moves WHERE accounting_day<$1
          UNION ALL
          SELECT 2,0,NULL,$2::date::text,$5,NULL,NULL,coalesce(sum(movement),0)::numeric(18,3)::text
          FROM moves
        )
        SELECT * FROM statement ORDER BY sort,day,entry_no
      `,
        [
          ...args,
          ar ? "رصيد بداية الفترة" : "Opening balance",
          ar ? "رصيد نهاية الفترة" : "Closing balance",
        ],
      );
      return table(q, defs, rows, ["movement"]);
    }
    case "profitability": {
      const rows = await select(`
        WITH direct AS (
          SELECT p.id AS project_id,p.name AS project,p.code,
            coalesce(-sum(l.amount) FILTER(WHERE a.kind='income'),0) AS income,
            coalesce(sum(l.amount) FILTER(WHERE a.kind='expense'),0) AS cost
          FROM modern.ledger_lines l JOIN modern.ledger_entries e ON e.id=l.entry_id
          JOIN modern.ledger_accounts a ON a.code=l.account_code JOIN modern.projects p ON p.id=l.project_id
          WHERE e.accounting_date BETWEEN $1 AND $2 AND ($3::uuid IS NULL OR p.id=$3)
          AND a.kind IN ('income','expense') GROUP BY p.id
        ) SELECT *,income-cost AS profit FROM direct ORDER BY profit DESC,project
      `);
      return table(
        q,
        [
          project,
          c("code", "الكود", "Code"),
          amount("income", "الإيراد", "Revenue"),
          amount("cost", "التكلفة المباشرة", "Direct cost"),
          amount("profit", "الربح المباشر", "Direct profit"),
        ],
        rows,
        ["income", "cost", "profit"],
        projectLink,
      );
    }
    case "projects": {
      const rows = await select(
        asOfProjects +
          `
        SELECT project_id,code,project,stage,due_date::text AS due,
          CASE WHEN stage<>9 AND due_date<$2 THEN ($2::date-due_date) ELSE 0 END AS overdue
        FROM scoped s WHERE stage<>9 OR (s.created_at${tz})::date BETWEEN $1 AND $2
          OR EXISTS (SELECT 1 FROM modern.audit a WHERE a.project_id=s.project_id AND a.action='transition'
            AND a.details->>'to'='9' AND (a.created_at${tz})::date BETWEEN $1 AND $2)
        ORDER BY overdue DESC,stage,project
      `,
      );
      return table(
        q,
        [
          project,
          c("code", "الكود", "Code"),
          c("stage", "المرحلة بنهاية الفترة", "Stage at period end", "stage"),
          c("due", "موعد التسليم", "Due date"),
          c("overdue", "أيام التأخير", "Days late"),
        ],
        rows,
        [],
        projectLink,
      );
    }
    case "municipality": {
      const rows = await select(`
        SELECT p.id AS project_id,p.name AS project,(a.created_at${tz})::date::text AS day,a.details->>'decision' AS state,
          a.details->>'reason' AS notes,(a.details->>'return_stage')::int AS stage
        FROM modern.audit a JOIN modern.projects p ON p.id=a.project_id
        WHERE a.action='municipality_decision' AND (a.created_at${tz})::date BETWEEN $1 AND $2 AND ($3::uuid IS NULL OR p.id=$3)
        ORDER BY a.created_at DESC
      `);
      return table(
        q,
        [
          day,
          project,
          c("state", "القرار", "Decision", "state"),
          notes,
          c("stage", "مرحلة الإرجاع", "Return stage", "stage"),
        ],
        rows,
        [],
        projectLink,
      );
    }
    case "visits": {
      const rows = await select(`
        SELECT r.visit_date::text AS day,p.id AS project_id,p.name AS project,u.name AS name,r.title AS notes,
          (SELECT count(*)::int FROM modern.documents d WHERE d.report_id=r.id) AS attachments
        FROM modern.reports r JOIN modern.projects p ON p.id=r.project_id LEFT JOIN modern.users u ON u.id=r.created_by
        WHERE r.visit_date BETWEEN $1 AND $2 AND ($3::uuid IS NULL OR p.id=$3)
        ORDER BY r.visit_date DESC
      `);
      return table(
        q,
        [
          day,
          project,
          c("name", "مهندس الإشراف", "Supervisor"),
          notes,
          c("attachments", "المرفقات", "Attachments"),
        ],
        rows,
        ["attachments"],
        projectLink,
      );
    }
    case "team": {
      const rows = await select(`
        WITH task_states AS (
          SELECT t.*,coalesce(h.status,'pending') AS stage_state
          FROM modern.tasks t LEFT JOIN LATERAL (
            SELECT a.details->>'status' AS status FROM modern.audit a WHERE a.project_id=t.project_id
              AND a.action='update_task' AND a.details->>'task_id'=t.id::text AND (a.created_at${tz})::date<=$2
            ORDER BY a.created_at DESC,a.id DESC LIMIT 1
          ) h ON true WHERE (t.created_at${tz})::date<=$2
        )
        SELECT u.name,
          count(t.id) FILTER(WHERE (t.created_at${tz})::date BETWEEN $1 AND $2)::int AS assigned,
          count(t.id) FILTER(WHERE t.stage_state<>'completed')::int AS open,
          count(t.id) FILTER(WHERE t.stage_state<>'completed' AND t.due_date<$2)::int AS late,
          count(t.id) FILTER(WHERE t.stage_state='completed' AND EXISTS(SELECT 1 FROM modern.audit a
            WHERE a.project_id=t.project_id AND a.action='update_task' AND a.details->>'task_id'=t.id::text AND a.details->>'status'='completed'
              AND (a.created_at${tz})::date BETWEEN $1 AND $2))::int AS done
        FROM modern.users u LEFT JOIN task_states t ON t.assigned_to=u.id
        WHERE u.role<>'client' AND ($3::uuid IS NULL OR u.id=$3) GROUP BY u.id ORDER BY late DESC,open DESC,u.name
      `);
      return table(
        q,
        [
          c("name", "الموظف", "Employee"),
          c("assigned", "جديدة في الفترة", "New in period"),
          c("done", "أُنجزت في الفترة", "Completed in period"),
          c("open", "مفتوحة بنهاية الفترة", "Open at period end"),
          c("late", "متأخرة بنهاية الفترة", "Late at period end"),
        ],
        rows,
        ["assigned", "done", "open", "late"],
      );
    }
    case "inquiries": {
      const rows = await select(
        `
        SELECT (i.created_at${tz})::date::text AS day,i.name,i.service,
          CASE WHEN (i.converted_at${tz})::date<=$2 THEN p.name END AS project,
          CASE WHEN (i.converted_at${tz})::date<=$2 THEN p.id END AS project_id,
          CASE WHEN (i.converted_at${tz})::date<=$2 THEN 1 ELSE 0 END AS converted,
          1 AS received
        FROM modern.inquiries i LEFT JOIN modern.projects p ON p.id=i.converted_project_id
        WHERE (i.created_at${tz})::date BETWEEN $1 AND $2 ORDER BY i.created_at DESC
      `,
        args.slice(0, 2),
      );
      return table(
        q,
        [
          day,
          name,
          c("service", "الخدمة", "Service"),
          project,
          c("received", "الطلبات", "Inquiries"),
          c("converted", "تحولت لمشروع", "Converted"),
        ],
        rows,
        ["received", "converted"],
        projectLink,
      );
    }
  }
}

export async function officeReport(
  user: User,
  params: URLSearchParams,
): Promise<ReportPage> {
  officeManager(user);
  const q = queryInput.parse(Object.fromEntries(params));
  if (q.from > q.to || q.from < "1900-01-01")
    throw new AppError("اختر فترة صحيحة");
  const from = Date.parse(q.from),
    to = Date.parse(q.to),
    oneDay = 86400000;
  const previous = {
    from: new Date(from - (to - from + oneDay)).toISOString().slice(0, 10),
    to: new Date(from - oneDay).toISOString().slice(0, 10),
  };
  return withActor(user, async (c) => ({
    ...(await load(c, q)),
    identity: await officeIdentity(c),
    ...(q.compare === "1"
      ? {
          comparison: {
            ...previous,
            ...(await load(c, { ...q, ...previous })),
          },
        }
      : {}),
  }));
}
