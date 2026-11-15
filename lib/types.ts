export const roles = [
  "manager",
  "secretary",
  "accountant",
  "architect",
  "civil_engineer",
  "draftsman",
  "municipality_draftsman",
  "site_supervisor",
  "client",
] as const;
export type Role = (typeof roles)[number];
export const roleLabels: Record<Role, string> = {
  manager: "المدير",
  secretary: "السكرتارية",
  accountant: "المحاسب",
  architect: "مهندس معماري",
  civil_engineer: "مهندس مدني",
  draftsman: "رسام الواجهات",
  municipality_draftsman: "رسام البلدية",
  site_supervisor: "مهندس الإشراف",
  client: "العميل",
};
export const stageLabels = [
  "استقبال المشروع",
  "التصميم المعماري",
  "الأعمال المدنية",
  "رسومات الواجهات",
  "تجهيز ملف البلدية",
  "اعتماد البلدية",
  "عقد الإشراف",
  "الإشراف الميداني",
  "إنهاء الإشراف",
  "مكتمل",
];
export const visibilityLabels = {
  status: "حالة المشروع والمرحلة",
  history: "تاريخ المراحل",
  notes: "ملاحظات المشروع",
  quotation: "قيمة التعاقد وعروض الأسعار",
  payment_schedule: "جدول الدفعات",
  payments: "الدفعات المسددة",
  balance: "المبلغ المتبقي",
  receipts: "إيصالات السداد",
  architecture: "الرسومات المعمارية",
  civil: "الملفات المدنية",
  drawings_2d: "رسومات 2D",
  drawings_3d: "رسومات 3D",
  municipality: "ملف البلدية والرخصة",
  site_photos: "صور الموقع",
  site_reports: "تقارير الإشراف",
  site_notes: "ملاحظات الإشراف",
  contract: "عقد المشروع",
  supervision_contract: "عقد الإشراف",
  municipality_letters: "خطابات البلدية",
  download: "تحميل الملفات",
};
export type Visibility = Partial<
  Record<keyof typeof visibilityLabels, boolean>
>;
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  client_id: string | null;
  active: boolean;
  must_change_password: boolean;
  created_at?: string;
};
export type Client = {
  id: string;
  name: string;
  national_id: string;
  phone: string;
  email: string | null;
  notes: string;
  created_at: string;
  user_id?: string;
};
export type Project = {
  id: string;
  code: string;
  name: string;
  client_id: string;
  client_name?: string;
  location: string;
  description?: string;
  stage?: number;
  status: string;
  due_date: string | null;
  contract_value?: string;
  balance?: string;
  visibility?: Visibility;
  version: number;
  created_at: string;
  municipality_decision?: string | null;
  closure_decision?: string | null;
};
export type Assignment = {
  id: string;
  project_id: string;
  user_id: string;
  stage: number;
  user_name?: string;
};
export type Document = {
  id: string;
  project_id: string;
  name: string;
  category: string;
  mime_type: string;
  size: number;
  created_at: string;
  uploaded_by: string;
  report_id?: string | null;
};
export type Report = {
  id: string;
  project_id: string;
  title: string;
  notes: string;
  visit_date: string;
  created_at: string;
  created_by: string;
};
export type Quotation = {
  id: string;
  project_id: string;
  amount: string;
  notes: string;
  version: number;
  created_at: string;
};
export type Allocation = {
  id: string;
  project_id: string;
  stage: number;
  percentage: string;
  amount?: string;
  due_date: string | null;
};
export type Payment = {
  id: string;
  project_id: string;
  amount: string;
  reference: string;
  paid_at: string;
  notes: string;
  created_at: string;
};
export type Task = {
  id: string;
  project_id: string;
  title: string;
  assigned_to: string;
  due_date: string | null;
  status: string;
  created_at: string;
};
export type Audit = {
  id: string;
  actor_name: string;
  action: string;
  project_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};
export type Inquiry = {
  id: string;
  name: string;
  phone: string;
  service: string;
  message: string;
  status: string;
  created_at: string;
};
export type Portfolio = {
  id: string;
  title: string;
  category: string;
  location: string;
  description: string;
  image_url: string;
  published: boolean;
  created_at: string;
};
export type Notification = {
  id: string;
  project_id: string | null;
  client_id: string;
  event: string;
  body: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
};
export type NotificationPreference = {
  client_id: string;
  enabled: boolean;
  events: Record<string, boolean>;
};
export type PlatformData = {
  user: User;
  projects: Project[];
  clients: Client[];
  users: User[];
  assignments: Assignment[];
  documents: Document[];
  reports: Report[];
  quotations: Quotation[];
  allocations: Allocation[];
  payments: Payment[];
  tasks: Task[];
  audit: Audit[];
  inquiries: Inquiry[];
  portfolio: Portfolio[];
  notifications: Notification[];
  notification_preferences: NotificationPreference[];
};
export type CommandResult = {
  ok: boolean;
  error?: string;
  id?: string;
  credentials?: { username: string; password: string };
};
