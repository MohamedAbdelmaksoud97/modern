"use client";
import { useState } from "react";
import { Upload, FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  drawingCategoriesByStage,
  stageLabels,
  type Project,
  type Document,
} from "@/lib/types";
import { usePlatform } from "./provider";
import { englishStages, usePreferences } from "./preferences";
import {
  ActionForm,
  AreaField,
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
  5: ["municipality_letters"],
  6: ["supervision_contract"],
  7: ["site_photos", "site_reports"],
  8: ["municipality_letters"],
};
export function DocumentList({
  documents,
  download = true,
  revisionHistory = false,
}: {
  documents: Document[];
  download?: boolean;
  revisionHistory?: boolean;
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
          {doc.revision_number && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" dir="ltr">
                v{doc.revision_number}
              </Badge>
              {revisionHistory && doc.revision_number === doc.published_revision && (
                <Badge variant="outline">{t("آخر نسخة مسلّمة", "Latest delivered revision")}</Badge>
              )}
              {revisionHistory && doc.revision_number > (doc.published_revision ?? 0) && (
                <Badge variant="outline">{t("قيد العمل", "Draft")}</Badge>
              )}
            </div>
          )}
          {revisionHistory && doc.revision_notes && (
            <p className="whitespace-pre-wrap break-words text-sm" dir="auto">
              {doc.revision_notes}
            </p>
          )}
          <div className="mt-auto flex flex-wrap gap-2">
            <Button
              nativeButton={false}
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
                nativeButton={false}
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

function DrawingHistory({
  drawings,
  editableCategories,
  onRevise,
}: {
  drawings: Document[];
  editableCategories: readonly string[];
  onRevise: (drawing: Document) => void;
}) {
  const { t, locale } = usePreferences();
  const stages = locale === "ar" ? stageLabels : englishStages;
  const groups = new Map<string, Document[]>();
  for (const doc of drawings) {
    if (!doc.drawing_id) continue;
    const revisions = groups.get(doc.drawing_id);
    if (revisions) revisions.push(doc);
    else groups.set(doc.drawing_id, [doc]);
  }
  const series = Array.from(groups.values());

  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-lg font-medium">{t("سجل التعديلات", "Revision history")}</h3>
      {Object.entries(drawingCategoriesByStage).map(([stage, kinds]) => {
        const stageDrawings = series.filter(([doc]) => kinds?.includes(doc.category));
        if (!stageDrawings.length) return null;
        return (
          <section key={stage} className="flex flex-col gap-4">
            <h4 className="font-medium">{stages[Number(stage)]}</h4>
            {stageDrawings.map((docs) => {
              const [latest, ...previous] = docs.sort(
                (a, b) => (b.revision_number ?? 0) - (a.revision_number ?? 0),
              );
              const title = latest.drawing_name || latest.name;
              const label = title.replace(/\.[^.]+$/, "") || title;
              return (
                <article
                  key={latest.drawing_id}
                  aria-label={label}
                  className="flex flex-col gap-3 border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h5 className="break-words text-sm font-medium" dir="auto">{label}</h5>
                      <p className="text-xs text-muted-foreground">{t(...categories[latest.category])}</p>
                    </div>
                    {editableCategories.includes(latest.category) && (
                      <Button variant="outline" onClick={() => onRevise(latest)}>
                        <Upload data-icon="inline-start" />
                        {t("رفع نسخة جديدة", "Upload revision")}
                      </Button>
                    )}
                  </div>
                  <DocumentList documents={[latest]} revisionHistory />
                  {previous.length > 0 && (
                    <details>
                      <summary className="w-fit cursor-pointer text-sm text-link">
                        {t("النسخ السابقة", "Previous revisions")} ({previous.length})
                      </summary>
                      <div className="mt-3">
                        <DocumentList documents={previous} revisionHistory />
                      </div>
                    </details>
                  )}
                </article>
              );
            })}
          </section>
        );
      })}
    </section>
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
  const [upload, setUpload] = useState<"drawing" | "document" | Document | null>(null);
  const docs = data.documents.filter((d) => d.project_id === project.id);
  const drawingDocs = portal ? [] : docs.filter((doc) => doc.drawing_id);
  const otherDocs = portal ? docs : docs.filter((doc) => !doc.drawing_id);
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
  const stage = project.stage ?? -1;
  const drawingCategories = editable ? drawingCategoriesByStage[stage] ?? [] : [];
  const allowedDocuments = editable ? stageCategories[stage] ?? [] : [];
  const canReceipts = ["manager", "accountant"].includes(data.user.role);
  const availableDocuments = [...allowedDocuments, ...(canReceipts ? ["receipts"] : [])];
  const revisionOf = typeof upload === "object" ? upload : null;
  const isDrawingUpload = upload === "drawing" || !!revisionOf;
  const available = isDrawingUpload ? drawingCategories : availableDocuments;
  const newDrawingLabel = t("رفع مخطط جديد", "Upload new drawing");
  const documentLabel = t("رفع مستند", "Upload document");
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
        {!portal && (
          <div className="flex flex-wrap gap-2">
            {drawingCategories.length > 0 && (
              <Button onClick={() => setUpload("drawing")}>
                <Upload data-icon="inline-start" />
                {newDrawingLabel}
              </Button>
            )}
            {availableDocuments.length > 0 && (
              <Button variant={drawingCategories.length ? "outline" : "default"} onClick={() => setUpload("document")}>
                <Upload data-icon="inline-start" />
                {documentLabel}
              </Button>
            )}
          </div>
        )}
      </div>
      {drawingDocs.length > 0 && (
        <DrawingHistory drawings={drawingDocs} editableCategories={drawingCategories} onRevise={setUpload} />
      )}
      {(otherDocs.length > 0 || drawingDocs.length === 0) && (
        <DocumentList documents={otherDocs} download={!portal || !!project.visibility?.download} />
      )}
      <FormDialog
        open={upload !== null}
        onOpenChange={(open) => { if (!open) setUpload(null); }}
        title={revisionOf ? t("رفع نسخة جديدة", "Upload revision") :
          isDrawingUpload ? newDrawingLabel : documentLabel}
        description={t(
          "الحد الأقصى 15 ميجابايت. PDF، صور JPEG وPNG وWebP، وملفات DWG وDXF.",
          "Maximum 15 MB. PDF, JPEG, PNG, WebP, DWG and DXF files.",
        )}
      >
        <ActionForm
          submitLabel={t("رفع الملف", "Upload file")}
          onSubmit={async (f) => {
            f.set("project_id", project.id);
            if (revisionOf?.drawing_id) {
              f.set("drawing_id", revisionOf.drawing_id);
              f.set("category", revisionOf.category);
            }
            if (f.get("report_id") === "none") f.delete("report_id");
            const res = await fetch("/api/files", { method: "POST", body: f });
            const json = await res.json();
            if (res.ok && json.ok) {
              await refresh();
              notify(t("تم رفع المستند", "Document uploaded"));
            }
            return json;
          }}
          onSuccess={() => setUpload(null)}
        >
          {revisionOf ? (
            <p className="break-words text-sm" dir="auto">{revisionOf.drawing_name || revisionOf.name}</p>
          ) : (
            <SelectField
              label={t("نوع المستند", "Document category")}
              name="category"
              options={available.map((c) => ({ value: c, label: t(...categories[c]) }))}
            />
          )}
          {isDrawingUpload && (
            <AreaField label={t("ملاحظة التعديل", "Revision note")} name="revision_notes" maxLength={4000} required={!!revisionOf} />
          )}
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
