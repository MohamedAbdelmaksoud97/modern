import { z } from "zod";
import type { PoolClient } from "pg";
import type { User, CommandResult } from "@/lib/types";
import type {
  InvoiceItem,
  JournalEntry,
  LedgerAccount,
  LedgerData,
  LedgerDocument,
  OfficeIdentity,
  Reconciliation,
  Vendor,
} from "@/lib/accounting-types";
import { withActor } from "./db";
import { audit, notify } from "./business";
import { AppError, milli, money } from "./rules";

const id = z.uuid();
const date = z.iso.date();
const text = z.string().trim().min(1).max(500);
const optional = z.string().trim().max(1000).optional().default("");
const code = z.string().regex(/^\d{4,8}$/);
const plus = z.string().transform(milli);
const signed = z
  .string()
  .regex(/^-?\d{1,10}(\.\d{1,3})?$/)
  .transform((value) => Math.round(Number(value) * 1000));
const docInput = z.object({
  id: id.optional(),
  direction: z.enum(["sale", "purchase"]),
  client_id: id.nullish(),
  vendor_id: id.nullish(),
  project_id: id.nullish(),
  allocation_stage: z.number().int().min(0).max(9).nullish(),
  account_code: code,
  issue_date: date,
  due_date: date,
  external_ref: optional,
  notes: optional,
  opening: z.boolean().optional().default(false),
  items: z
    .array(
      z.object({
        description: text,
        quantity: z.number().int().min(1).max(10000),
        price: plus,
      }),
    )
    .max(60),
});
const settlementInput = z
  .array(z.object({ document_id: id, amount: plus }))
  .max(60);
const identityInput = z.object({
  name_ar: text,
  name_en: text,
  address: optional,
  phone: optional,
  email: optional,
  registration: optional,
  payment_instructions: optional,
});
type LedgerSettings = {
  opening_date: string | null;
  closed_through: string | null;
};
type Line = {
  code: string;
  amount: number;
  project?: string | null;
  client?: string | null;
  vendor?: string | null;
};
type EntryInput = {
  kind: string;
  date: string;
  description: string;
  reference?: string;
  reverses?: string;
};
type Settlement = { document: LedgerDocument; amount: number };
type T = PoolClient;
const isoToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuwait",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const asMills = (value: string) => Math.round(Number(value) * 1000);

export function officeFinance(user: User) {
  if (!["manager", "accountant"].includes(user.role))
    throw new AppError("حسابات المكتب للمدير والمحاسب", 403);
}
export function officeManager(user: User) {
  if (user.role !== "manager")
    throw new AppError("هذا الإجراء للمدير فقط", 403);
}
async function settings(c: T) {
  return (
    await c.query<LedgerSettings>(
      "SELECT opening_date::text,closed_through::text FROM modern.ledger_settings WHERE id",
    )
  ).rows[0];
}
export async function officeIdentity(c: T) {
  return (
    await c.query<OfficeIdentity>(
      "SELECT name_ar,name_en,address,phone,email,registration,payment_instructions FROM modern.office_identity WHERE id",
    )
  ).rows[0];
}
const documentSelect = `
  SELECT d.*,d.issue_date::text,d.due_date::text,p.name AS project_name,
         coalesce(s.paid,0)::numeric(14,3)::text AS paid,coalesce(s.credited,0)::numeric(14,3)::text AS credited,
         (CASE WHEN d.status='reversed' THEN 0 ELSE d.total-coalesce(s.paid,0)-coalesce(s.credited,0) END)::numeric(14,3)::text AS outstanding
  FROM modern.ledger_documents d LEFT JOIN modern.projects p ON p.id=d.project_id
  LEFT JOIN LATERAL (
    SELECT sum(amount) FILTER(WHERE kind='payment') AS paid, sum(amount) FILTER(WHERE kind='credit') AS credited
    FROM modern.ledger_settlements WHERE document_id=d.id
  ) s ON true`;

export async function listOfficeInvoices(user: User, project?: string) {
  if (user.role !== "client") officeFinance(user);
  return withActor(
    user,
    async (c) =>
      (
        await c.query<LedgerDocument>(
          documentSelect +
            " WHERE ($1::uuid IS NULL OR d.project_id=$1) ORDER BY d.issue_date DESC,d.number DESC NULLS FIRST",
          [project ? id.parse(project) : null],
        )
      ).rows,
  );
}
export async function ledgerLookups(user: User) {
  officeFinance(user);
  return withActor(user, async (c) => ({
    accounts: (
      await c.query("SELECT * FROM modern.ledger_accounts ORDER BY code")
    ).rows,
    vendors: (
      await c.query("SELECT * FROM modern.ledger_vendors ORDER BY name")
    ).rows,
  }));
}

export async function getOfficeLedger(user: User): Promise<LedgerData> {
  officeFinance(user);
  return withActor(user, async (c) => ({
    ...(await settings(c)),
    identity: await officeIdentity(c),
    accounts: (
      await c.query<LedgerAccount>(`
      SELECT a.*,coalesce(sum(l.amount),0)::numeric(18,3)::text AS balance
      FROM modern.ledger_accounts a LEFT JOIN modern.ledger_lines l ON l.account_code=a.code GROUP BY a.code ORDER BY a.code
    `)
    ).rows,
    vendors: (
      await c.query<Vendor>("SELECT * FROM modern.ledger_vendors ORDER BY name")
    ).rows,
    documents: (
      await c.query<LedgerDocument>(
        documentSelect +
          " ORDER BY d.issue_date DESC,d.number DESC NULLS FIRST",
      )
    ).rows,
    entries: (
      await c.query<JournalEntry>(`
      SELECT e.id,e.entry_no::text,e.accounting_date::text,e.kind,e.description,e.reference,e.reverses_id,
        EXISTS (SELECT 1 FROM modern.ledger_entries r WHERE r.reverses_id=e.id) AS reversed,
        jsonb_agg(jsonb_build_object('id',l.id,'account_code',l.account_code,'amount',l.amount::text,
          'project_id',l.project_id,'client_id',l.client_id,'vendor_id',l.vendor_id,'reconciliation_id',r.reconciliation_id) ORDER BY l.amount DESC,l.id) AS lines
      FROM modern.ledger_entries e JOIN modern.ledger_lines l ON l.entry_id=e.id
      LEFT JOIN modern.ledger_reconciled_lines r ON r.line_id=l.id
      GROUP BY e.id ORDER BY e.accounting_date DESC,e.entry_no DESC
    `)
    ).rows,
    reconciliations: (
      await c.query<Reconciliation>(`
      SELECT r.id,r.account_code,r.statement_date::text,r.statement_balance,r.book_balance,r.cleared_balance,r.notes
      FROM modern.ledger_reconciliations r ORDER BY r.statement_date DESC,r.created_at DESC
    `)
    ).rows,
    advances: (
      await c.query<{ client_id: string; balance: string }>(
        "SELECT client_id,(-sum(amount))::numeric(18,3)::text AS balance FROM modern.ledger_lines WHERE account_code='2200' AND client_id IS NOT NULL GROUP BY client_id HAVING sum(amount)<0",
      )
    ).rows,
  }));
}

async function getAccount(c: T, accountCode: string, expected?: string[]) {
  const a = (
    await c.query<LedgerAccount>(
      "SELECT code,kind FROM modern.ledger_accounts WHERE code=$1",
      [accountCode],
    )
  ).rows[0];
  if (!a || (expected && !expected.includes(a.kind)))
    throw new AppError("الحساب المختار غير مناسب لهذه الحركة");
  return a;
}
async function party(c: T, type: "sale" | "purchase", partyId: string) {
  const table = type === "sale" ? "clients" : "ledger_vendors";
  const row = (
    await c.query<{ name: string }>(
      "SELECT name FROM modern." + table + " WHERE id=$1",
      [partyId],
    )
  ).rows[0];
  if (!row) throw new AppError("الطرف غير موجود", 404);
  return row.name;
}
async function scopeProject(
  c: T,
  project?: string | null,
  client?: string | null,
) {
  if (!project) return;
  const p = (
    await c.query<{ client_id: string }>(
      "SELECT client_id FROM modern.projects WHERE id=$1",
      [project],
    )
  ).rows[0];
  if (!p || (client && p.client_id !== client))
    throw new AppError("المشروع لا يطابق العميل أو غير متاح");
}
function openDate(s: LedgerSettings, d: string) {
  if (!s.opening_date) throw new AppError("حدد تاريخ افتتاح الدفتر أولاً");
  if (d < s.opening_date || (s.closed_through && d <= s.closed_through))
    throw new AppError("التاريخ خارج الفترة المحاسبية المفتوحة");
  if (d > isoToday()) throw new AppError("تاريخ الحركة المحاسبية في المستقبل");
}
async function journal(
  c: T,
  user: User,
  s: LedgerSettings,
  header: EntryInput,
  lines: Line[],
) {
  openDate(s, header.date);
  if (
    lines.length < 2 ||
    lines.some(
      (line) =>
        line.amount === 0 ||
        !Number.isSafeInteger(line.amount) ||
        Math.abs(line.amount) >= 1e14,
    ) ||
    lines.reduce((total, line) => total + BigInt(line.amount), BigInt(0)) !==
      BigInt(0)
  )
    throw new AppError("إجمالي المدين يجب أن يساوي إجمالي الدائن");
  const entry = (
    await c.query<{ id: string; entry_no: string }>(
      `
    INSERT INTO modern.ledger_entries(accounting_date,kind,description,reference,actor_id,reverses_id)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id,entry_no::text
  `,
      [
        header.date,
        header.kind,
        header.description,
        header.reference ?? "",
        user.id,
        header.reverses ?? null,
      ],
    )
  ).rows[0];
  await c.query(
    `
    INSERT INTO modern.ledger_lines(entry_id,account_code,amount,project_id,client_id,vendor_id)
    SELECT $1,r.code,r.amount,r.project,r.client,r.vendor FROM jsonb_to_recordset($2::jsonb)
      r(code text,amount numeric,project uuid,client uuid,vendor uuid)
  `,
    [
      entry.id,
      JSON.stringify(
        lines.map((line) => ({ ...line, amount: money(line.amount) })),
      ),
    ],
  );
  return entry;
}
async function document(c: T, docId: string) {
  const row = (
    await c.query<LedgerDocument>(documentSelect + " WHERE d.id=$1", [docId])
  ).rows[0];
  if (!row) throw new AppError("الفاتورة غير موجودة", 404);
  return row;
}
function dimensions(d: LedgerDocument) {
  return { project: d.project_id, client: d.client_id, vendor: d.vendor_id };
}
async function settlement(
  c: T,
  entry: string,
  documentId: string,
  amount: number,
  kind = "payment",
) {
  await c.query(
    "INSERT INTO modern.ledger_settlements(entry_id,document_id,amount,kind) VALUES($1,$2,$3,$4)",
    [entry, documentId, money(amount), kind],
  );
}
async function eligibleSettlements(
  c: T,
  rows: z.output<typeof settlementInput>,
  direction: "sale" | "purchase",
  partyId: string,
  day: string,
): Promise<Settlement[]> {
  if (new Set(rows.map((row) => row.document_id)).size !== rows.length)
    throw new AppError("الفاتورة مكررة في التوزيع");
  const list: Settlement[] = [];
  for (const row of rows) {
    const d = await document(c, row.document_id);
    if (
      d.direction !== direction ||
      (d.client_id ?? d.vendor_id) !== partyId ||
      d.status !== "posted" ||
      d.issue_date > day ||
      row.amount > asMills(d.outstanding)
    )
      throw new AppError("توزيع السداد لا يطابق الفاتورة أو يتجاوز المستحق");
    list.push({ document: d, amount: row.amount });
  }
  return list;
}
async function advanceBalance(c: T, client: string, day: string) {
  const { rows } = await c.query<{ total: string }>(
    `
    WITH movements AS (
      SELECT e.accounting_date AS day,-sum(l.amount) AS movement FROM modern.ledger_lines l
        JOIN modern.ledger_entries e ON e.id=l.entry_id WHERE l.client_id=$1 AND l.account_code='2200'
        GROUP BY e.accounting_date
      UNION ALL SELECT $2::date,0
    ), running AS (
      SELECT day,sum(sum(movement)) OVER(ORDER BY day) AS balance FROM movements GROUP BY day
    ) SELECT coalesce(min(balance),0)::text AS total FROM running WHERE day >= $2
  `,
    [client, day],
  );
  return asMills(rows[0].total);
}
async function allocate(
  c: T,
  user: User,
  s: LedgerSettings,
  client: string,
  day: string,
  rows: Settlement[],
  reference = "",
) {
  if (!rows.length) throw new AppError("اختر فاتورة واحدة على الأقل");
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  if (total > (await advanceBalance(c, client, day)))
    throw new AppError("التوزيع يتجاوز رصيد الدفعات المقدمة");
  const entry = await journal(
    c,
    user,
    s,
    {
      kind: "allocation",
      date: day,
      description: "توزيع دفعة عميل",
      reference,
    },
    [
      { code: "2200", amount: total, client },
      ...rows.map(({ document, amount }) => ({
        code: "1100",
        amount: -amount,
        ...dimensions(document),
      })),
    ],
  );
  for (const row of rows)
    await settlement(c, entry.id, row.document.id, row.amount);
  for (const project of new Set(
    rows.flatMap(({ document: d }) => (d.project_id ? [d.project_id] : [])),
  )) {
    const auditId = await audit(c, user, "ledger_project_payment", project, {
      entry_id: entry.id,
    });
    await notify(c, project, "payment_recorded", auditId);
  }
  return entry.id;
}

async function saveDocument(c: T, user: User, s: LedgerSettings, raw: unknown) {
  const d = docInput.parse(raw);
  openDate(s, d.issue_date);
  if (!d.opening && d.due_date < d.issue_date)
    throw new AppError("تاريخ الاستحقاق يسبق الإصدار");
  const sale = d.direction === "sale";
  const pid = sale ? d.client_id : d.vendor_id;
  if (!pid || (sale ? d.vendor_id : d.client_id))
    throw new AppError("اختر العميل أو المورد المناسب");
  const name = await party(c, d.direction, pid);
  await scopeProject(c, d.project_id, d.client_id);
  await getAccount(c, d.account_code, sale ? ["income"] : ["expense", "asset"]);
  if (d.opening) {
    officeManager(user);
    if (d.issue_date !== s.opening_date || d.allocation_stage != null)
      throw new AppError("الرصيد الافتتاحي لازم يكون بتاريخ افتتاح الدفتر");
  }
  let items: InvoiceItem[] = d.items.map((item) => ({
    ...item,
    price: money(item.price),
    amount: money(item.price * item.quantity),
  }));
  if (d.allocation_stage != null) {
    if (!sale || !d.project_id)
      throw new AppError("اختر مشروعاً للدفعة التعاقدية");
    const installment = (
      await c.query<{ amount: string }>(
        `
      SELECT round(a.percentage*p.contract_value/100,3)::text AS amount
      FROM modern.allocations a JOIN modern.projects p ON p.id=a.project_id WHERE a.project_id=$1 AND a.stage=$2
    `,
        [d.project_id, d.allocation_stage],
      )
    ).rows[0];
    if (!installment || asMills(installment.amount) <= 0)
      throw new AppError("لا توجد قيمة للدفعة التعاقدية المحددة");
    items = [
      {
        description:
          items[0]?.description ?? "دفعة تعاقدية / Contract installment",
        quantity: 1,
        price: installment.amount,
        amount: installment.amount,
      },
    ];
  }
  const total = items.reduce((sum, item) => sum + asMills(item.amount), 0);
  if (!Number.isSafeInteger(total) || total <= 0 || total >= 1e14)
    throw new AppError("أدخل بنود فاتورة بقيمة صحيحة");
  const params = [
    d.direction,
    d.client_id ?? null,
    d.vendor_id ?? null,
    d.project_id ?? null,
    d.allocation_stage ?? null,
    d.account_code,
    d.issue_date,
    d.due_date,
    d.external_ref,
    name,
    JSON.stringify(items),
    money(total),
    d.notes,
    d.opening,
  ];
  if (d.id) {
    const prior = await document(c, d.id);
    if (prior.status !== "draft")
      throw new AppError("يمكن تعديل مسودة الفاتورة فقط");
    if (prior.opening) officeManager(user);
    await c.query(
      `UPDATE modern.ledger_documents SET direction=$1,client_id=$2,vendor_id=$3,project_id=$4,allocation_stage=$5,account_code=$6,issue_date=$7,due_date=$8,external_ref=$9,party_name=$10,items=$11,total=$12,notes=$13,opening=$14 WHERE id=$15`,
      [...params, d.id],
    );
    return d.id;
  }
  return (
    await c.query<{ id: string }>(
      `
    INSERT INTO modern.ledger_documents(direction,client_id,vendor_id,project_id,allocation_stage,account_code,issue_date,due_date,external_ref,party_name,items,total,notes,opening)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id
  `,
      params,
    )
  ).rows[0].id;
}
async function issueDocument(
  c: T,
  user: User,
  s: LedgerSettings,
  docId: string,
) {
  const d = await document(c, docId);
  if (d.status !== "draft") throw new AppError("الفاتورة ليست مسودة");
  if (d.opening) officeManager(user);
  const total = asMills(d.total);
  const sale = d.direction === "sale";
  const entry = await journal(
    c,
    user,
    s,
    {
      kind: d.opening ? "opening" : sale ? "invoice" : "vendor_bill",
      date: d.issue_date,
      description: d.party_name,
      reference: d.external_ref,
    },
    [
      {
        code: sale ? "1100" : "2100",
        amount: sale ? total : -total,
        ...dimensions(d),
      },
      {
        code: d.opening ? "3000" : d.account_code,
        amount: sale ? -total : total,
        ...dimensions(d),
      },
    ],
  );
  const number =
    (d.opening ? "OB" : sale ? "INV" : "BILL") +
    "-" +
    d.issue_date.slice(0, 4) +
    "-" +
    entry.entry_no.padStart(6, "0");
  await c.query(
    "UPDATE modern.ledger_documents SET status='posted',number=$2,entry_id=$3,office_snapshot=$4 WHERE id=$1",
    [d.id, number, entry.id, JSON.stringify(await officeIdentity(c))],
  );
  return d.id;
}

async function reverse(
  c: T,
  user: User,
  s: LedgerSettings,
  originalId: string,
  day: string,
  reason: string,
) {
  officeManager(user);
  const original = (
    await c.query<{ kind: string; accounting_date: string; entry_no: string }>(
      "SELECT kind,accounting_date::text,entry_no::text FROM modern.ledger_entries WHERE id=$1",
      [originalId],
    )
  ).rows[0];
  if (
    !original ||
    original.kind === "reversal" ||
    day < original.accounting_date
  )
    throw new AppError("اختر قيداً قابلاً للعكس وتاريخاً صحيحاً");
  if (
    (
      await c.query(
        "SELECT 1 FROM modern.ledger_entries WHERE reverses_id=$1",
        [originalId],
      )
    ).rowCount
  )
    throw new AppError("تم عكس هذا القيد بالفعل", 409);
  const source = (
    await c.query<LedgerDocument>(documentSelect + " WHERE d.entry_id=$1", [
      originalId,
    ])
  ).rows[0];
  if (source && (asMills(source.paid) || asMills(source.credited)))
    throw new AppError("اعكس تسويات الفاتورة قبل عكسها");
  const lines = (
    await c.query<{
      account_code: string;
      amount: string;
      project_id: string | null;
      client_id: string | null;
      vendor_id: string | null;
    }>(
      "SELECT account_code,amount::text,project_id,client_id,vendor_id FROM modern.ledger_lines WHERE entry_id=$1",
      [originalId],
    )
  ).rows;
  for (const l of lines) {
    if (
      l.account_code === "2200" &&
      l.client_id &&
      asMills(l.amount) < 0 &&
      -asMills(l.amount) > (await advanceBalance(c, l.client_id, day))
    )
      throw new AppError("اعكس توزيع الدفعة المقدمة قبل عكس التحصيل");
  }
  const entry = await journal(
    c,
    user,
    s,
    {
      kind: "reversal",
      date: day,
      description: reason,
      reference: original.entry_no,
      reverses: originalId,
    },
    lines.map((l) => ({
      code: l.account_code,
      amount: -asMills(l.amount),
      project: l.project_id,
      client: l.client_id,
      vendor: l.vendor_id,
    })),
  );
  await c.query(
    "INSERT INTO modern.ledger_settlements(entry_id,document_id,amount,kind) SELECT $1,document_id,-amount,kind FROM modern.ledger_settlements WHERE entry_id=$2",
    [entry.id, originalId],
  );
  if (source)
    await c.query(
      "UPDATE modern.ledger_documents SET status='reversed' WHERE id=$1",
      [source.id],
    );
  return entry.id;
}

async function reconcile(c: T, user: User, s: LedgerSettings, raw: unknown) {
  const p = z
    .object({
      account: code,
      date,
      statement_balance: signed,
      notes: optional,
      lines: z.array(id).max(1000),
    })
    .parse(raw);
  openDate(s, p.date);
  await getAccount(c, p.account, ["cash", "bank"]);
  if (
    (
      await c.query(
        "SELECT 1 FROM modern.ledger_reconciliations WHERE account_code=$1 AND statement_date>$2 LIMIT 1",
        [p.account, p.date],
      )
    ).rowCount
  )
    throw new AppError("التاريخ يسبق آخر كشف حساب تمت مطابقته");
  const chosen = new Set(p.lines);
  if (chosen.size !== p.lines.length)
    throw new AppError("الحركة مكررة في المطابقة");
  const { rows } = await c.query<{
    id: string;
    amount: string;
    cleared: boolean;
  }>(
    `
    SELECT l.id,l.amount::text,(r.line_id IS NOT NULL) AS cleared FROM modern.ledger_lines l JOIN modern.ledger_entries e ON e.id=l.entry_id
    LEFT JOIN modern.ledger_reconciled_lines r ON r.line_id=l.id WHERE l.account_code=$1 AND e.accounting_date<=$2
  `,
    [p.account, p.date],
  );
  if (rows.filter((l) => chosen.has(l.id) && !l.cleared).length !== chosen.size)
    throw new AppError("اختيار الحركات غير متاح للمطابقة");
  const book = rows.reduce((sum, l) => sum + asMills(l.amount), 0);
  const cleared = rows.reduce(
    (sum, l) => sum + (l.cleared || chosen.has(l.id) ? asMills(l.amount) : 0),
    0,
  );
  const saved = (
    await c.query<{ id: string }>(
      `
    INSERT INTO modern.ledger_reconciliations(account_code,statement_date,statement_balance,book_balance,cleared_balance,notes,actor_id)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id
  `,
      [
        p.account,
        p.date,
        money(p.statement_balance),
        money(book),
        money(cleared),
        p.notes,
        user.id,
      ],
    )
  ).rows[0];
  await c.query(
    "INSERT INTO modern.ledger_reconciled_lines(line_id,reconciliation_id) SELECT unnest($1::uuid[]),$2",
    [p.lines, saved.id],
  );
  return saved.id;
}

export async function accountingCommand(
  user: User,
  raw: unknown,
): Promise<CommandResult> {
  officeFinance(user);
  const input = z.object({ action: text }).passthrough().parse(raw);
  return withActor(user, async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(73918420)");
    const s = await settings(c);
    let resultId: string | undefined;
    switch (input.action) {
      case "start": {
        officeManager(user);
        const p = z.object({ date }).parse(input);
        if (s.opening_date || p.date > isoToday())
          throw new AppError(
            "لا يمكن تغيير تاريخ الافتتاح بعد اعتماده أو اختيار تاريخ في المستقبل",
          );
        await c.query(
          "UPDATE modern.ledger_settings SET opening_date=$1 WHERE id",
          [p.date],
        );
        break;
      }
      case "close_period": {
        officeManager(user);
        const p = z.object({ date, reason: text }).parse(input);
        openDate(s, p.date);
        if (
          (
            await c.query(
              "SELECT 1 FROM modern.ledger_documents WHERE status='draft' AND issue_date<=$1 LIMIT 1",
              [p.date],
            )
          ).rowCount
        )
          throw new AppError("اعتمد أو ألغِ مسودات الفواتير قبل إقفال الفترة");
        await c.query(
          "UPDATE modern.ledger_settings SET closed_through=$1 WHERE id",
          [p.date],
        );
        break;
      }
      case "save_identity": {
        officeManager(user);
        const p = identityInput.parse(input);
        await c.query(
          "UPDATE modern.office_identity SET name_ar=$1,name_en=$2,address=$3,phone=$4,email=$5,registration=$6,payment_instructions=$7 WHERE id",
          [
            p.name_ar,
            p.name_en,
            p.address,
            p.phone,
            p.email,
            p.registration,
            p.payment_instructions,
          ],
        );
        break;
      }
      case "create_account": {
        officeManager(user);
        const p = z
          .object({
            code,
            kind: z.enum([
              "cash",
              "bank",
              "asset",
              "liability",
              "equity",
              "income",
              "expense",
            ]),
            name_ar: text,
            name_en: text,
          })
          .parse(input);
        await c.query(
          "INSERT INTO modern.ledger_accounts(code,name_ar,name_en,kind) VALUES($1,$2,$3,$4)",
          [p.code, p.name_ar, p.name_en, p.kind],
        );
        break;
      }
      case "save_vendor": {
        const p = z
          .object({
            id: id.optional(),
            name: text,
            phone: optional,
            email: optional,
            reference: optional,
          })
          .parse(input);
        const params = [p.name, p.phone, p.email, p.reference];
        const { rows } = p.id
          ? await c.query<{ id: string }>(
              "UPDATE modern.ledger_vendors SET name=$1,phone=$2,email=$3,reference=$4 WHERE id=$5 RETURNING id",
              [...params, p.id],
            )
          : await c.query<{ id: string }>(
              "INSERT INTO modern.ledger_vendors(name,phone,email,reference) VALUES($1,$2,$3,$4) RETURNING id",
              params,
            );
        if (!rows[0]) throw new AppError("المورد غير موجود", 404);
        resultId = rows[0].id;
        break;
      }
      case "save_document":
        resultId = await saveDocument(c, user, s, input);
        break;
      case "issue_document":
        resultId = await issueDocument(
          c,
          user,
          s,
          z.object({ id }).parse(input).id,
        );
        break;
      case "cancel_draft": {
        const doc = await document(c, z.object({ id }).parse(input).id);
        if (doc.status !== "draft") throw new AppError("الفاتورة ليست مسودة");
        if (doc.opening) officeManager(user);
        await c.query(
          "UPDATE modern.ledger_documents SET status='cancelled' WHERE id=$1",
          [doc.id],
        );
        resultId = doc.id;
        break;
      }
      case "credit": {
        const p = z
          .object({ id, date, amount: plus, reason: text })
          .parse(input);
        const d = await document(c, p.id);
        if (
          d.status !== "posted" ||
          p.date < d.issue_date ||
          p.amount > asMills(d.outstanding)
        )
          throw new AppError(
            "قيمة الإشعار الدائن تتجاوز المستحق أو التاريخ غير صالح",
          );
        const sale = d.direction === "sale";
        const entry = await journal(
          c,
          user,
          s,
          {
            kind: "credit",
            date: p.date,
            description: p.reason,
            reference: d.number ?? "",
          },
          [
            {
              code: d.opening ? "3000" : d.account_code,
              amount: sale ? p.amount : -p.amount,
              ...dimensions(d),
            },
            {
              code: sale ? "1100" : "2100",
              amount: sale ? -p.amount : p.amount,
              ...dimensions(d),
            },
          ],
        );
        await settlement(c, entry.id, d.id, p.amount, "credit");
        resultId = entry.id;
        break;
      }
      case "receipt":
      case "apply_advance": {
        const p = z
          .object({
            client_id: id,
            date,
            items: settlementInput.default([]),
            reference: optional,
          })
          .parse(input);
        const name = await party(c, "sale", p.client_id);
        const rows = await eligibleSettlements(
          c,
          p.items,
          "sale",
          p.client_id,
          p.date,
        );
        const amountAllocated = rows.reduce(
          (sum, item) => sum + item.amount,
          0,
        );
        if (input.action === "receipt") {
          const receipt = z
            .object({ account: code, amount: plus })
            .parse(input);
          await getAccount(c, receipt.account, ["cash", "bank"]);
          if (amountAllocated > receipt.amount)
            throw new AppError("التوزيع يتجاوز قيمة سند القبض");
          resultId = (
            await journal(
              c,
              user,
              s,
              {
                kind: "receipt",
                date: p.date,
                description: name,
                reference: p.reference,
              },
              [
                {
                  code: receipt.account,
                  amount: receipt.amount,
                  client: p.client_id,
                },
                { code: "2200", amount: -receipt.amount, client: p.client_id },
              ],
            )
          ).id;
        }
        if (rows.length || input.action === "apply_advance") {
          const allocated = await allocate(
            c,
            user,
            s,
            p.client_id,
            p.date,
            rows,
            p.reference,
          );
          resultId ??= allocated;
        }
        break;
      }
      case "vendor_payment": {
        const p = z
          .object({
            vendor_id: id,
            date,
            items: settlementInput,
            account: code,
            reference: optional,
          })
          .parse(input);
        const name = await party(c, "purchase", p.vendor_id);
        const rows = await eligibleSettlements(
          c,
          p.items,
          "purchase",
          p.vendor_id,
          p.date,
        );
        if (!rows.length) throw new AppError("اختر فاتورة واحدة على الأقل");
        await getAccount(c, p.account, ["cash", "bank"]);
        const total = rows.reduce((sum, row) => sum + row.amount, 0);
        const entry = await journal(
          c,
          user,
          s,
          {
            kind: "vendor_payment",
            date: p.date,
            description: name,
            reference: p.reference,
          },
          [
            ...rows.map(({ document, amount }) => ({
              code: "2100",
              amount,
              ...dimensions(document),
            })),
            { code: p.account, amount: -total, vendor: p.vendor_id },
          ],
        );
        for (const row of rows)
          await settlement(c, entry.id, row.document.id, row.amount);
        resultId = entry.id;
        break;
      }
      case "expense":
      case "payroll":
      case "transfer":
      case "refund": {
        const p = z
          .object({
            date,
            description: text,
            reference: optional,
            from: code,
            to: code,
            amount: plus,
            project_id: id.nullish(),
            client_id: id.nullish(),
          })
          .parse(input);
        if (p.from === p.to) throw new AppError("اختر حسابين مختلفين");
        const kind = input.action;
        if (kind === "refund") {
          officeManager(user);
          if (
            !p.client_id ||
            p.to !== "2200" ||
            p.amount > (await advanceBalance(c, p.client_id, p.date))
          )
            throw new AppError(
              "المبلغ يتجاوز رصيد الدفعات المقدمة المتاح للرد",
            );
        }
        await getAccount(
          c,
          p.from,
          kind === "payroll" ? ["cash", "bank", "liability"] : ["cash", "bank"],
        );
        await getAccount(
          c,
          p.to,
          kind === "transfer"
            ? ["cash", "bank"]
            : kind === "refund"
              ? ["advance"]
              : ["expense", "asset"],
        );
        await scopeProject(c, p.project_id);
        resultId = (
          await journal(
            c,
            user,
            s,
            {
              kind,
              date: p.date,
              description: p.description,
              reference: p.reference,
            },
            [
              {
                code: p.to,
                amount: p.amount,
                project: p.project_id,
                client: p.client_id,
              },
              { code: p.from, amount: -p.amount, client: p.client_id },
            ],
          )
        ).id;
        break;
      }
      case "opening":
      case "adjustment": {
        officeManager(user);
        const p = z
          .object({
            date,
            description: text,
            lines: z
              .array(
                z.object({
                  account: code,
                  amount: signed,
                  client_id: id.nullish(),
                  project_id: id.nullish(),
                }),
              )
              .min(2)
              .max(50),
          })
          .parse(input);
        const lines: Line[] = [];
        for (const line of p.lines) {
          const a = await getAccount(
            c,
            line.account,
            input.action === "opening"
              ? ["cash", "bank", "asset", "liability", "equity", "advance"]
              : [
                  "cash",
                  "bank",
                  "asset",
                  "liability",
                  "equity",
                  "income",
                  "expense",
                ],
          );
          if (a.kind === "advance") {
            if (
              input.action !== "opening" ||
              !line.client_id ||
              line.amount >= 0
            )
              throw new AppError(
                "مقدمات العملاء الافتتاحية تحتاج عميل ورصيداً دائناً",
              );
            await party(c, "sale", line.client_id);
          }
          await scopeProject(c, line.project_id, line.client_id);
          lines.push({
            code: line.account,
            amount: line.amount,
            client: line.client_id,
            project: line.project_id,
          });
        }
        resultId = (
          await journal(
            c,
            user,
            s,
            { kind: input.action, date: p.date, description: p.description },
            lines,
          )
        ).id;
        break;
      }
      case "reverse": {
        const p = z.object({ id, date, reason: text }).parse(input);
        resultId = await reverse(c, user, s, p.id, p.date, p.reason);
        break;
      }
      case "reconcile":
        resultId = await reconcile(c, user, s, input);
        break;
      default:
        throw new AppError("إجراء مالي غير معروف");
    }
    await audit(c, user, "ledger_" + input.action, null, {
      id: resultId,
      date: input.date,
      reason: input.reason,
    });
    return { ok: true, id: resultId };
  });
}
