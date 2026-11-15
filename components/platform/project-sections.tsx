"use client";
import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel } from "@/components/ui/field";
import { visibilityLabels, type Project, type Visibility } from "@/lib/types";
import { usePlatform } from "./provider";
import { usePreferences } from "./preferences";
import {
  ActionForm,
  FormDialog,
  TextField,
  AreaField,
  NoData,
  formObject,
  date,
} from "./forms";
import { DocumentList } from "./project-documents";
const englishVisibility: Record<keyof typeof visibilityLabels, string> = {
  status: "Project status & stage",
  history: "Stage history",
  notes: "Project notes",
  quotation: "Contract value & quotations",
  payment_schedule: "Payment schedule",
  payments: "Recorded payments",
  balance: "Outstanding balance",
  receipts: "Payment receipts",
  architecture: "Architectural drawings",
  civil: "Civil engineering files",
  drawings_2d: "2D drawings",
  drawings_3d: "3D drawings",
  municipality: "Municipality file & permit",
  site_photos: "Site photographs",
  site_reports: "Site supervision reports",
  site_notes: "Supervision notes",
  contract: "Project contract",
  supervision_contract: "Supervision contract",
  municipality_letters: "Municipality correspondence",
  download: "Download files",
};
export function ProjectPermissions({ project }: { project: Project }) {
  const { command } = usePlatform(),
    { t } = usePreferences();
  const [visibility, setVisibility] = useState<Visibility>(
    project.visibility || {},
  );
  return (
    <section className="app-panel">
      <div className="mb-7 flex items-start gap-3">
        <ShieldCheck className="mt-1 size-6 shrink-0 text-link" />
        <div>
          <h2>{t("صلاحيات اطلاع العميل", "Client visibility permissions")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            {t(
              "حدد ما يستطيع العميل الاطلاع عليه في هذا المشروع. تتطبق التغييرات فور حفظها، وتشمل بوابة العميل وإشعارات واتساب. تحميل الملفات صلاحية منفصلة عن عرضها.",
              "Choose what the client can see in this project. Changes apply immediately to the client portal and WhatsApp notifications. File downloads are controlled separately from viewing.",
            )}
          </p>
        </div>
      </div>
      <ActionForm
        onSubmit={() =>
          command("set_visibility", { project_id: project.id, visibility })
        }
      >
        <div className="grid gap-x-8 gap-y-0 md:grid-cols-2">
          {Object.entries(visibilityLabels).map(([key, label]) => (
            <Field
              key={key}
              orientation="horizontal"
              className="justify-between border-b py-4"
            >
              <FieldLabel
                htmlFor={`permission-${key}`}
                className="cursor-pointer text-sm"
              >
                {t(
                  label,
                  englishVisibility[key as keyof typeof englishVisibility],
                )}
              </FieldLabel>
              <Switch
                id={`permission-${key}`}
                checked={!!visibility[key as keyof Visibility]}
                onCheckedChange={(checked) =>
                  setVisibility((v) => ({ ...v, [key]: checked }))
                }
              />
            </Field>
          ))}
        </div>
      </ActionForm>
    </section>
  );
}
export function ProjectReports({
  project,
  portal = false,
}: {
  project: Project;
  portal?: boolean;
}) {
  const { data, command } = usePlatform(),
    { t } = usePreferences(),
    [open, setOpen] = useState(false);
  const reports = data.reports.filter((r) => r.project_id === project.id);
  const canCreate =
    !portal &&
    project.stage === 7 &&
    ["manager", "site_supervisor"].includes(data.user.role);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium">
            {t("زيارات وتقارير الإشراف", "Site visits & reports")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "سجل مستمر للزيارات، والصور، وملاحظات التنفيذ.",
              "A continuous record of visits, photographs and construction notes.",
            )}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            {t("تقرير زيارة جديد", "New visit report")}
          </Button>
        )}
      </div>
      {reports.length ? (
        reports.map((report) => (
          <article key={report.id} className="app-panel">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-medium">{report.title}</h3>
              <span className="text-xs text-muted-foreground">
                {date(report.visit_date)}
              </span>
            </div>
            {report.notes && (
              <p className="mb-5 whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
                {report.notes}
              </p>
            )}
            <DocumentList
              documents={data.documents.filter(
                (d) => d.report_id === report.id,
              )}
              download={!portal || !!project.visibility?.download}
            />
          </article>
        ))
      ) : (
        <NoData
          title={t("لا توجد زيارات مسجلة بعد", "No site visits recorded yet")}
          description={t(
            "تُضاف تقارير الزيارة أثناء الإشراف الميداني، وتبقى جميع الزيارات السابقة محفوظة.",
            "Visit reports are added during site supervision. All previous visits remain preserved.",
          )}
        />
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t("تقرير زيارة جديد", "New visit report")}
      >
        <ActionForm
          onSubmit={(f) =>
            command("create_report", {
              ...formObject(f),
              project_id: project.id,
            })
          }
          onSuccess={() => setOpen(false)}
        >
          <TextField
            label={t("عنوان التقرير", "Report title")}
            name="title"
            required
            maxLength={200}
          />
          <TextField
            label={t("تاريخ الزيارة", "Visit date")}
            name="visit_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
          <AreaField
            label={t("الأعمال والملاحظات", "Work completed & observations")}
            name="notes"
            required
            maxLength={10000}
          />
          <p className="text-xs leading-6 text-muted-foreground">
            {t(
              "بعد حفظ التقرير، ارفع صور الزيارة والمرفقات من قسم المستندات.",
              "After saving the report, upload visit photographs and attachments from Documents.",
            )}
          </p>
        </ActionForm>
      </FormDialog>
    </div>
  );
}
