"use client";
import { useState } from "react";
import { Upload, FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Project, type Document } from "@/lib/types";
import { usePlatform } from "./provider";
import { usePreferences } from "./preferences";
import {
  ActionForm,
  FormDialog,
  SelectField,
  TextField,
  NoData,
  date,
} from "./forms";
export const categories: Record<string, [string, string]> = {
  contract: [
    "عقد المشروع والمستندات الأولية",
    "Project contract & initial documents",
  ],
  architecture: ["الرسومات المعمارية", "Architectural drawings"],
  civil: ["الملفات المدنية", "Civil engineering"],
  drawings_2d: ["رسومات الواجهات 2D", "2D facade drawings"],
  drawings_3d: ["رسومات الواجهات 3D", "3D facade drawings"],
  municipality: ["ملف البلدية والرخصة", "Municipality file & permit"],
  supervision_contract: ["عقد الإشراف", "Supervision contract"],
  municipality_letters: ["خطابات البلدية", "Municipality correspondence"],
  site_photos: ["صور الموقع", "Site photographs"],
  site_reports: ["تقارير الإشراف", "Site reports"],
  receipts: ["إيصالات الدفع", "Payment receipts"],
};
const stageCategories: Record<number, string[]> = {
  0: ["contract"],
  1: ["architecture"],
  2: ["civil"],
  3: ["drawings_2d", "drawings_3d"],
  4: ["municipality"],
  5: ["municipality_letters"],
  6: ["supervision_contract"],
  7: ["site_photos", "site_reports"],
  8: ["municipality_letters"],
};
export function DocumentList({
  documents,
  download = true,
}: {
  documents: Document[];
  download?: boolean;
}) {
  const { t } = usePreferences();
  return documents.length ? (
    <div className="grid gap-3 sm:grid-cols-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex min-w-0 flex-col gap-4 border bg-card p-5"
        >
          <div className="flex min-w-0 items-start gap-3">
            <FileText className="size-6 shrink-0 text-link" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" title={doc.name}>
                {doc.name}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {categories[doc.category]
                  ? t(...categories[doc.category])
                  : doc.category}{" "}
                · {(Number(doc.size) / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {date(doc.created_at)}
              </p>
            </div>
          </div>
          <div className="mt-auto flex gap-2">
            <Button
              variant="outline"
              render={
                <a
                  href={`/api/files/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <ExternalLink data-icon="inline-start" />
              {t("عرض الملف", "View file")}
            </Button>
            {download && (
              <Button
                variant="ghost"
                size="icon"
                className="px-0!"
                aria-label={`${t("تحميل", "Download")} ${doc.name}`}
                render={<a href={`/api/files/${doc.id}?download=1`} download />}
              >
                <Download />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <NoData
      title={t("لا توجد مستندات لعرضها", "No documents to display")}
      description={t(
        "ستجد هنا الملفات المرتبطة بالمشروع والمسموح لحسابك بالاطلاع عليها.",
        "Files linked to this project and shared with your account will appear here.",
      )}
    />
  );
}
export function ProjectDocuments({
  project,
  portal = false,
}: {
  project: Project;
  portal?: boolean;
}) {
  const { data, refresh, notify } = usePlatform(),
    { t } = usePreferences();
  const [open, setOpen] = useState(false);
  const docs = data.documents.filter((d) => d.project_id === project.id);
  const roleStage: Record<number, string> = {
    1: "architect",
    2: "civil_engineer",
    3: "draftsman",
    4: "municipality_draftsman",
    7: "site_supervisor",
  };
  const editable =
    !portal &&
    (["manager", "secretary"].includes(data.user.role) ||
      (roleStage[project.stage ?? -1] === data.user.role &&
        data.assignments.some(
          (a) =>
            a.project_id === project.id &&
            a.stage === project.stage &&
            a.user_id === data.user.id,
        )));
  const allowed = editable ? stageCategories[project.stage ?? -1] || [] : [];
  const canReceipts = ["manager", "accountant"].includes(data.user.role);
  const available = [...allowed, ...(canReceipts ? ["receipts"] : [])];
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium">
            {t("مستندات المشروع", "Project documents")}
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {t(
              "تُحفظ جميع المرفقات كسجلات مستقلة دون استبدال الملفات السابقة.",
              "Every attachment is preserved as a separate record. Previous files are never replaced.",
            )}
          </p>
        </div>
        {!portal && available.length > 0 && (editable || canReceipts) && (
          <Button onClick={() => setOpen(true)}>
            <Upload data-icon="inline-start" />
            {t("رفع مستند", "Upload document")}
          </Button>
        )}
      </div>
      <DocumentList
        documents={docs}
        download={!portal || !!project.visibility?.download}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t("رفع مستند", "Upload document")}
        description={t(
          "الحد الأقصى 15 ميجابايت. PDF، صور JPEG وPNG وWebP، وملفات DWG وDXF.",
          "Maximum 15 MB. PDF, JPEG, PNG, WebP, DWG and DXF files.",
        )}
      >
        <ActionForm
          submitLabel={t("رفع الملف", "Upload file")}
          onSubmit={async (f) => {
            f.set("project_id", project.id);
            if (f.get("report_id") === "none") f.delete("report_id");
            const res = await fetch("/api/files", { method: "POST", body: f });
            const json = await res.json();
            if (res.ok && json.ok) {
              await refresh();
              notify(t("تم رفع المستند", "Document uploaded"));
            }
            return json;
          }}
          onSuccess={() => setOpen(false)}
        >
          <SelectField
            label={t("نوع المستند", "Document category")}
            name="category"
            options={available.map((c) => ({
              value: c,
              label: t(...categories[c]),
            }))}
          />
          {project.stage === 7 &&
            data.reports.some((r) => r.project_id === project.id) && (
              <SelectField
                label={t("ربط بتقرير زيارة", "Link to site visit")}
                name="report_id"
                defaultValue="none"
                options={[
                  {
                    value: "none",
                    label: t("مستند عام للمشروع", "General project document"),
                  },
                  ...data.reports
                    .filter((r) => r.project_id === project.id)
                    .map((r) => ({
                      value: r.id,
                      label: `${r.title} · ${date(r.visit_date)}`,
                    })),
                ]}
              />
            )}
          <TextField
            label={t("الملف", "File")}
            name="file"
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png,.webp,.dwg,.dxf"
          />
        </ActionForm>
      </FormDialog>
    </section>
  );
}
export function AllDocuments({ portal = false }: { portal?: boolean }) {
  const { data } = usePlatform(),
    { t } = usePreferences();
  const [projectId, setProjectId] = useState("all"),
    [query, setQuery] = useState("");
  const docs = data.documents.filter(
    (d) =>
      (projectId === "all" || d.project_id === projectId) &&
      d.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="section-label mb-2">
          {t("أرشيف المكتب", "OFFICE ARCHIVE")}
        </p>
        <h1 className="text-3xl font-medium">{t("المستندات")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "نسخة محفوظة من كل تفصيلة في مشروعك.",
            "A preserved record of every project detail.",
          )}
        </p>
      </div>
      <div className="grid items-end gap-4 sm:grid-cols-2">
        <TextField
          label={t("البحث باسم الملف", "Search file name")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SelectField
          label={t("المشروع", "Project")}
          name="project_filter"
          defaultValue="all"
          options={[
            { value: "all", label: t("جميع المشروعات", "All projects") },
            ...data.projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
          onChange={setProjectId}
        />
      </div>
      {portal ? (
        <div className="flex flex-col gap-7">
          {data.projects
            .filter((p) => projectId === "all" || p.id === projectId)
            .map((p) => (
              <section key={p.id}>
                <h2 className="mb-4 font-medium">{p.name}</h2>
                <DocumentList
                  documents={docs.filter((d) => d.project_id === p.id)}
                  download={!!p.visibility?.download}
                />
              </section>
            ))}
        </div>
      ) : (
        <DocumentList documents={docs} />
      )}
    </div>
  );
}
