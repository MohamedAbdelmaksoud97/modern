"use client";
import { useState } from "react";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import type { Portfolio } from "@/lib/types";
import { usePlatform } from "./provider";
import { usePreferences } from "./preferences";
import {
  ActionForm,
  FormDialog,
  TextField,
  AreaField,
  SelectField,
  NoData,
  formObject,
  date,
  ErrorNotice,
} from "./forms";
export function Inquiries() {
  const { data, command } = usePlatform(),
    { t } = usePreferences();
  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="section-label mb-2">
          {t("فرص جديدة", "NEW CONVERSATIONS")}
        </p>
        <h1 className="text-3xl font-medium">{t("طلبات التواصل")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "طلبات الاستشارة الواردة من الموقع التعريفي.",
            "Consultation requests received through your website.",
          )}
        </p>
      </div>
      {data.inquiries.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.inquiries.map((i) => (
            <article key={i.id} className="app-panel">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2>{i.name}</h2>
                  <a
                    href={`tel:${i.phone.replace(/[^+\d]/g, "")}`}
                    className="mt-3 block text-sm text-link"
                    dir="ltr"
                  >
                    {i.phone}
                  </a>
                </div>
                <span className="text-xs text-muted-foreground">
                  {date(i.created_at)}
                </span>
              </div>
              <Badge variant="secondary">{i.service}</Badge>
              <p className="my-5 whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
                {i.message}
              </p>
              <ActionForm
                onSubmit={(f) =>
                  command("update_inquiry", {
                    id: i.id,
                    status: f.get("status"),
                  })
                }
                submitLabel={t("تحديث الحالة", "Update status")}
              >
                <SelectField
                  label={t("حالة الطلب", "Inquiry status")}
                  name="status"
                  defaultValue={i.status}
                  options={[
                    { value: "new", label: t("جديد", "New") },
                    { value: "contacted", label: t("تم التواصل", "Contacted") },
                    { value: "closed", label: t("مغلق", "Closed") },
                  ]}
                />
              </ActionForm>
            </article>
          ))}
        </div>
      ) : (
        <NoData
          title={t("لا توجد طلبات تواصل بعد", "No inquiries yet")}
          description={t(
            "ستظهر هنا رسائل الزوار بعد إرسال نموذج طلب الاستشارة.",
            "Messages will appear here when visitors submit a consultation request.",
          )}
        />
      )}
    </div>
  );
}
export function PortfolioAdmin() {
  const { data, command } = usePlatform(),
    { t } = usePreferences(),
    [open, setOpen] = useState(false),
    [edit, setEdit] = useState<Portfolio | null>(null),
    [imageUrl, setImageUrl] = useState(""),
    [published, setPublished] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  function start(entry?: Portfolio) {
    setEdit(entry || null);
    setImageUrl(entry?.image_url || "");
    setPublished(entry?.published || false);
    setError("");
    setOpen(true);
  }
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label mb-2">
            {t("معرض المكتب", "OFFICE PORTFOLIO")}
          </p>
          <h1 className="text-3xl font-medium">{t("سابقة الأعمال")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "انشر أعمال المكتب الفعلية لتظهر في الموقع التعريفي.",
              "Publish your office's actual work to display it on your website.",
            )}
          </p>
        </div>
        <Button onClick={() => start()}>
          <Plus data-icon="inline-start" />
          {t("إضافة عمل", "Add project")}
        </Button>
      </div>
      {data.portfolio.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.portfolio.map((p) => (
            <article key={p.id} className="overflow-hidden border bg-card">
              <div className="relative aspect-[4/3] bg-muted">
                <Image
                  src={p.image_url}
                  alt={p.title}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-link">{p.category}</span>
                  <Badge variant="secondary">
                    {p.published
                      ? t("منشور", "Published")
                      : t("مسودة", "Draft")}
                  </Badge>
                </div>
                <h2 className="text-lg font-medium">{p.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {p.location}
                </p>
                <Button
                  className="mt-5"
                  variant="outline"
                  onClick={() => start(p)}
                >
                  <Pencil data-icon="inline-start" />
                  {t("تعديل")}
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <NoData
          title={t(
            "مساحة لأعمال تستحق أن تُرى",
            "A place for work worth seeing",
          )}
          description={t(
            "أضف صور وتفاصيل مشروعات المكتب. تبقى المسودات خاصة حتى تنشرها.",
            "Add photos and details of your office projects. Drafts remain private until published.",
          )}
        />
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={
          edit
            ? t("تعديل العمل", "Edit project")
            : t("إضافة عمل للموقع", "Add portfolio project")
        }
      >
        <ActionForm
          key={edit?.id || "new"}
          onSubmit={(f) =>
            command("save_portfolio", {
              ...formObject(f),
              ...(edit ? { id: edit.id } : {}),
              image_url: imageUrl,
              published,
            })
          }
          onSuccess={() => setOpen(false)}
        >
          <TextField
            label={t("عنوان العمل", "Project title")}
            name="title"
            defaultValue={edit?.title}
            required
          />
          <TextField
            label={t("التصنيف", "Category")}
            name="category"
            defaultValue={edit?.category}
            required
            placeholder={t("سكني، تجاري…", "Residential, commercial…")}
          />
          <TextField
            label={t("الموقع", "Location")}
            name="location"
            defaultValue={edit?.location}
            required
          />
          <AreaField
            label={t("وصف العمل", "Project description")}
            name="description"
            defaultValue={edit?.description}
          />
          <TextField
            label={t("رابط الصورة", "Image URL")}
            name="image_url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            required
            placeholder="https://…"
            hint={t(
              "أو ارفع صورة من جهازك أدناه.",
              "Or upload a photograph from your device below.",
            )}
          />
          <TextField
            label={t("رفع صورة (حتى 5 ميجابايت)", "Upload photo (up to 5 MB)")}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              setError("");
              try {
                const form = new FormData();
                form.set("file", file);
                const res = await fetch("/api/portfolio-images", {
                  method: "POST",
                  body: form,
                });
                const result = await res.json();
                if (!res.ok)
                  throw new Error(
                    result.error || t("تعذر رفع الصورة", "Image upload failed"),
                  );
                setImageUrl(result.url);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : t("تعذر رفع الصورة", "Image upload failed"),
                );
              } finally {
                setUploading(false);
              }
            }}
          />
          {uploading && (
            <p role="status">{t("جارٍ رفع الصورة…", "Uploading photo…")}</p>
          )}
          <ErrorNotice error={error} />
          <Field orientation="horizontal">
            <FieldLabel htmlFor="portfolio-published">
              {t("نشر في الموقع التعريفي", "Publish on website")}
            </FieldLabel>
            <Switch
              id="portfolio-published"
              checked={published}
              onCheckedChange={setPublished}
            />
          </Field>
        </ActionForm>
      </FormDialog>
    </div>
  );
}
const actionLabels: Record<string, [string, string]> = {
  create_client: ["إنشاء عميل", "Client created"],
  update_client: ["تعديل عميل", "Client updated"],
  create_project: ["إنشاء مشروع", "Project created"],
  update_project: ["تعديل مشروع", "Project updated"],
  assign: ["إسناد مرحلة", "Stage assigned"],
  transition: ["تسليم مرحلة", "Stage completed"],
  create_report: ["إضافة تقرير إشراف", "Site report added"],
  create_quotation: ["إصدار عرض سعر", "Quotation issued"],
  create_payment: ["تسجيل دفعة", "Payment recorded"],
  set_allocations: ["تعديل نسب التعاقد", "Allocations updated"],
  set_visibility: ["تعديل صلاحيات العميل", "Client permissions changed"],
  create_employee: ["إنشاء موظف", "Employee added"],
  update_user: ["تعديل حساب", "Account updated"],
  reset_password: ["إعادة تعيين كلمة مرور", "Password reset"],
  password_changed: ["تغيير كلمة مرور", "Password changed"],
  document_uploaded: ["رفع مستند", "Document uploaded"],
  upload_document: ["رفع مستند", "Document uploaded"],
  municipality_decision: [
    "تسجيل قرار البلدية",
    "Municipality decision recorded",
  ],
  closure_decision: ["تسجيل قرار إنهاء الإشراف", "Closure decision recorded"],
  create_task: ["إنشاء مهمة", "Task created"],
  update_task: ["تحديث مهمة", "Task updated"],
  save_portfolio: ["تحديث سابقة الأعمال", "Portfolio updated"],
  update_inquiry: ["تحديث طلب تواصل", "Inquiry updated"],
};
export function auditLabel(
  action: string,
  t: (ar: string, en?: string) => string,
) {
  return actionLabels[action] ? t(...actionLabels[action]) : action;
}
export function AuditTrail() {
  const { data } = usePlatform(),
    { t } = usePreferences(),
    [query, setQuery] = useState("");
  const entries = data.audit.filter((a) =>
    `${a.actor_name} ${a.action} ${auditLabel(a.action, t)}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="section-label mb-2">
          {t("الشفافية والتتبع", "TRANSPARENCY & TRACEABILITY")}
        </p>
        <h1 className="text-3xl font-medium">{t("سجل العمليات")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "سجل لا يُستبدل للعمليات المهمة وهوية منفذها الفعلي.",
            "An append-only record of important operations and the person who performed them.",
          )}
        </p>
      </div>
      <div className="max-w-lg">
        <TextField
          label={t("البحث في السجل", "Search audit trail")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {entries.length ? (
        <div className="data-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("العملية", "Action")}</TableHead>
                <TableHead>{t("المستخدم", "User")}</TableHead>
                <TableHead>{t("المشروع", "Project")}</TableHead>
                <TableHead>{t("التاريخ", "Date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{auditLabel(a.action, t)}</TableCell>
                  <TableCell>{a.actor_name}</TableCell>
                  <TableCell>
                    {data.projects.find((p) => p.id === a.project_id)?.name ||
                      "—"}
                  </TableCell>
                  <TableCell>{date(a.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <NoData />
      )}
    </div>
  );
}
export function AccountSettings() {
  const { data } = usePlatform(),
    { t, locale, theme, toggleLocale, toggleTheme } = usePreferences();
  return (
    <div className="flex max-w-3xl flex-col gap-7">
      <div>
        <p className="section-label mb-2">
          {t("مساحتك الخاصة", "YOUR PREFERENCES")}
        </p>
        <h1 className="text-3xl font-medium">{t("الحساب والإعدادات")}</h1>
      </div>
      <section className="app-panel">
        <h2 className="mb-5">{t("بيانات الحساب", "Account details")}</h2>
        <p>{data.user.name}</p>
        <p className="mt-2 text-sm text-muted-foreground" dir="auto">
          {data.user.email}
        </p>
        <Button
          className="mt-6"
          variant="outline"
          render={<a href="/change-password" />}
        >
          {t("تغيير كلمة المرور")}
        </Button>
      </section>
      <section className="app-panel">
        <h2 className="mb-5">{t("تفضيلات العرض", "Display preferences")}</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b py-5">
          <div>
            <p>{t("اللغة", "Language")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {locale === "ar" ? "العربية" : "English"}
            </p>
          </div>
          <Button variant="outline" onClick={toggleLocale}>
            {locale === "ar" ? "English" : "العربية"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div>
            <p>{t("المظهر", "Appearance")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {theme === "dark" ? t("الوضع الداكن") : t("الوضع الفاتح")}
            </p>
          </div>
          <Button variant="outline" onClick={toggleTheme}>
            {theme === "dark" ? t("الوضع الفاتح") : t("الوضع الداكن")}
          </Button>
        </div>
      </section>
    </div>
  );
}
