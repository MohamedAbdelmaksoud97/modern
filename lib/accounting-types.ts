export type AccountKind =
  | "cash"
  | "bank"
  | "receivable"
  | "payable"
  | "advance"
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense";

export type OfficeIdentity = {
  name_ar: string;
  name_en: string;
  address: string;
  phone: string;
  email: string;
  registration: string;
  payment_instructions: string;
};

export type LedgerAccount = {
  code: string;
  kind: AccountKind;
  name_ar: string;
  name_en: string;
  balance: string;
};

export type Vendor = {
  id: string;
  name: string;
  phone: string;
  email: string;
  reference: string;
};
export type InvoiceItem = {
  description: string;
  quantity: number;
  price: string;
  amount: string;
};
export type LedgerDocument = {
  id: string;
  direction: "sale" | "purchase";
  status: "draft" | "posted" | "reversed" | "cancelled";
  client_id: string | null;
  vendor_id: string | null;
  project_id: string | null;
  project_name?: string | null;
  account_code: string;
  allocation_stage: number | null;
  party_name: string;
  issue_date: string;
  due_date: string;
  number: string | null;
  external_ref: string;
  items: InvoiceItem[];
  total: string;
  paid: string;
  credited: string;
  outstanding: string;
  notes: string;
  opening: boolean;
  entry_id: string | null;
  office_snapshot: OfficeIdentity | null;
};

export type JournalLine = {
  id: string;
  account_code: string;
  amount: string;
  project_id: string | null;
  client_id: string | null;
  vendor_id: string | null;
  reconciliation_id: string | null;
};
export type JournalEntry = {
  id: string;
  entry_no: string;
  accounting_date: string;
  kind: string;
  description: string;
  reference: string;
  reversed: boolean;
  reverses_id: string | null;
  lines: JournalLine[];
};
export type Reconciliation = {
  id: string;
  account_code: string;
  statement_date: string;
  statement_balance: string;
  book_balance: string;
  cleared_balance: string;
  notes: string;
};
export type LedgerData = {
  opening_date: string | null;
  closed_through: string | null;
  identity: OfficeIdentity;
  accounts: LedgerAccount[];
  vendors: Vendor[];
  documents: LedgerDocument[];
  entries: JournalEntry[];
  reconciliations: Reconciliation[];
  advances: { client_id: string; balance: string }[];
};
export type ReportColumn = {
  ar: string;
  en: string;
  format?: "money" | "stage" | "state";
};
export type ReportRow = { cells: (string | number | null)[]; href?: string };
export type ReportPage = {
  columns: ReportColumn[];
  rows: ReportRow[];
  totals?: ReportRow;
  comparison?: {
    from: string;
    to: string;
    rows: ReportRow[];
    totals?: ReportRow;
  };
  identity: OfficeIdentity;
};
export const officeReportLabels = {
  summary: ["ملخص الإدارة", "Management summary"],
  income: ["قائمة الدخل", "Income statement"],
  position: ["المركز المالي", "Balance sheet"],
  trial: ["ميزان المراجعة", "Trial balance"],
  journal: ["دفتر الأستاذ", "General ledger"],
  cash: ["حركة الخزائن والبنوك", "Cash and bank movements"],
  receivables: ["أعمار ذمم العملاء", "Receivables aging"],
  payables: ["أعمار ذمم الموردين", "Payables aging"],
  client: ["كشف حساب عميل", "Customer statement"],
  vendor: ["كشف حساب مورد", "Supplier statement"],
  profitability: ["ربحية المشروعات", "Project profitability"],
  projects: ["مراحل المشروعات والتأخير", "Project stages and delays"],
  municipality: ["قرارات البلدية", "Municipality decisions"],
  visits: ["زيارات الإشراف", "Supervision visits"],
  team: ["عبء العمل والمهام", "Team workload"],
  inquiries: ["الاستشارات والتحويل لمشروعات", "Inquiries and conversions"],
} as const;
export type OfficeReport = keyof typeof officeReportLabels;
