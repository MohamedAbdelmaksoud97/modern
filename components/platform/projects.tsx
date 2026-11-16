"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  ArrowUpLeft,
  MapPin,
  CalendarDays,
  UserRound,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { stageLabels, roleLabels, type Project } from "@/lib/types";
import { usePlatform } from "./provider";
import { usePreferences, englishStages, englishRoles } from "./preferences";
import {
  TextField,
  SearchField,
  AreaField,
  SelectField,
  ActionForm,
  FormDialog,
  formObject,
  NoData,
  date,
  money,
} from "./forms";
import { ProjectDocuments } from "./project-documents";
import { ProjectFinance } from "./project-finance";
import { ProjectReports, ProjectPermissions } from "./project-sections";

export function useLabels() {
  const { locale } = usePreferences();
  return {
    stages: locale === "ar" ? stageLabels : englishStages,
    roles: locale === "ar" ? roleLabels : englishRoles,
  };
}
export function Projects({
  portal = false,
  filter,
}: {
  portal?: boolean;
  filter?: "municipality" | "supervision";
}) {
  const { data, command } = usePlatform(),
    { t } = usePreferences(),
    { stages } = useLabels(),
    params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setDialogOpen] = useState(params.get("new") === "1"),
    [query, setQuery] = useState(""),
    [stage, setStage] = useState("all");
  function setOpen(next: boolean) {
    setDialogOpen(next);
    if (!next && params.has("new")) {
      const query = new URLSearchParams(params.toString());
      query.delete("new");
      query.delete("inquiry");
      router.replace(pathname + (query.size ? "?" + query.toString() : ""), {
        scroll: false,
      });
    }
  }
  const admin = ["manager", "secretary"].includes(data.user.role),
    base = portal ? "/portal" : "/workspace";
  const projects = data.projects.filter(
    (p) =>
      (!filter ||
        (filter === "municipality"
          ? [4, 5, 8].includes(p.stage ?? -1)
          : [6, 7, 8].includes(p.stage ?? -1))) &&
      (stage === "all" || p.stage === Number(stage)) &&
      `${p.name} ${p.code} ${p.client_name || ""} ${p.location}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label mb-2">
            {t("إدارة المشروعات", "PROJECT MANAGEMENT")}
          </p>
          <h1 className="text-3xl font-medium">
            {filter === "municipality"
              ? t("معاملات البلدية")
              : filter === "supervision"
                ? t("الإشراف الميداني")
                : t("المشروعات")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "رحلة واضحة لكل مشروع، من أول فكرة إلى التسليم.",
              "A clear journey for every project, from the first idea to handover.",
            )}
          </p>
        </div>
        {admin && (
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            {t("مشروع جديد")}
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <SearchField
            id="project-search"
            label={t("البحث في المشروعات", "Search projects")}
            placeholder={t(
              "ابحث باسم المشروع أو العميل أو الرقم…",
              "Search by project, client or reference…",
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-full shrink-0 sm:w-60">
          <SelectField
            label={t("المرحلة", "Stage")}
            name="stage_filter"
            defaultValue="all"
            onChange={setStage}
            options={[
              { value: "all", label: t("جميع المراحل", "All stages") },
              ...stages.map((s, i) => ({ value: String(i), label: s })),
            ]}
          />
        </div>
      </div>
      {projects.length ? (
        <div className="data-table-wrap">
          <Table aria-label={t("قائمة المشروعات", "Projects list")}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("المشروع", "Project")}</TableHead>
                {!portal && <TableHead>{t("العميل", "Client")}</TableHead>}
                <TableHead>{t("المرحلة الحالية", "Current stage")}</TableHead>
                <TableHead>{t("الموقع", "Location")}</TableHead>
                <TableHead>{t("موعد التسليم", "Due date")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("التفاصيل", "Details")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="min-w-48 max-w-72 whitespace-normal">
                    <Link
                      href={`${base}/projects/${p.id}`}
                      className="font-medium hover:text-link hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p
                      className="mt-1 font-mono text-[11px] text-muted-foreground"
                      dir="ltr"
                    >
                      {p.code}
                    </p>
                  </TableCell>
                  {!portal && (
                    <TableCell className="min-w-36 max-w-48 whitespace-normal">
                      {p.client_name ||
                        data.clients.find((c) => c.id === p.client_id)?.name ||
                        "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="secondary">
                      {p.stage === undefined
                        ? t("خاص", "Private")
                        : stages[p.stage]}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-36 max-w-48 whitespace-normal">
                    {p.location || "—"}
                  </TableCell>
                  <TableCell>{date(p.due_date)}</TableCell>
                  <TableCell>
                    <Button
                      nativeButton={false}
                      variant="ghost"
                      size="icon"
                      className="px-0!"
                      render={
                        <Link
                          href={`${base}/projects/${p.id}`}
                          aria-label={`${t("تفاصيل", "Details")} ${p.name}`}
                        />
                      }
                    >
                      <ArrowUpLeft />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <NoData
          title={
            query
              ? t("لا توجد نتائج مطابقة", "No matching projects")
              : t("لا توجد مشروعات بعد", "No projects yet")
          }
          description={
            query
              ? t(
                  "جرّب كلمة بحث أو مرحلة مختلفة.",
                  "Try another search term or stage.",
                )
              : t(
                  "ابدأ بإضافة عميل، ثم أنشئ مشروعه الأول.",
                  "Start by adding a client, then create their first project.",
                )
          }
        />
      )}
      <FormDialog open={open} onOpenChange={setOpen} title={t("مشروع جديد")}>
        <ActionForm
          onSubmit={(f) => command("create_project", {
            ...formObject(f),
            inquiry_id: params.get("inquiry") || undefined,
          })}
          onSuccess={() => setOpen(false)}
        >
          <TextField
            label={t("اسم المشروع", "Project name")}
            name="name"
            required
            maxLength={160}
          />
          <SelectField
            label={t("العميل", "Client")}
            name="client_id"
            options={data.clients.map((c) => ({ value: c.id, label: c.name }))}
          />
          {!data.clients.length && (
            <p className="text-sm text-warning">
              {t(
                "أضف عميلًا أولًا من صفحة العملاء.",
                "Add a client from the Clients page first.",
              )}{" "}
              <Link href="/workspace/clients" className="underline">
                {t("فتح العملاء", "Open clients")}
              </Link>
            </p>
          )}
          <TextField
            label={t("موقع المشروع", "Project location")}
            name="location"
            required
            maxLength={250}
          />
          <TextField
            label={t("موعد التسليم", "Due date")}
            name="due_date"
            type="date"
          />
          <AreaField
            label={t("وصف المشروع", "Project description")}
            name="description"
            maxLength={5000}
          />
        </ActionForm>
      </FormDialog>
    </div>
  );
}

export function ProjectDetail({
  id,
  portal = false,
}: {
  id: string;
  portal?: boolean;
}) {
  const { data, command } = usePlatform(),
    { t } = usePreferences(),
    { stages, roles } = useLabels();
  const [edit, setEdit] = useState(false),
    [advance, setAdvance] = useState(false);
  const p = data.projects.find((p) => p.id === id);
  if (!p)
    return (
      <NoData
        title={t("المشروع غير متاح", "Project unavailable")}
        description={t(
          "قد لا يكون المشروع موجودًا أو ليس لديك صلاحية الاطلاع عليه.",
          "This project may not exist or may not be shared with your account.",
        )}
      />
    );
  const admin = ["manager", "secretary"].includes(data.user.role),
    finance = ["manager", "secretary", "accountant", "client"].includes(
      data.user.role,
    ),
    isManager = data.user.role === "manager",
    isEngineer = [
      "architect",
      "civil_engineer",
      "draftsman",
      "municipality_draftsman",
      "site_supervisor",
    ].includes(data.user.role);
  const roleStage: Record<number, string> = {
    1: "architect",
    2: "civil_engineer",
    3: "draftsman",
    4: "municipality_draftsman",
    7: "site_supervisor",
  };
  const ownsStage =
    isEngineer &&
    roleStage[p.stage ?? -1] === data.user.role &&
    data.assignments.some(
      (a) =>
        a.project_id === id &&
        a.stage === p.stage &&
        a.user_id === data.user.id,
    );
  const assignments = data.assignments.filter((a) => a.project_id === id),
    projectTasks = data.tasks.filter((a) => a.project_id === id),
    history = data.audit.filter((a) => a.project_id === id);
  const showFinance =
    finance &&
    (!portal ||
      Object.entries(p.visibility || {}).some(
        ([k, v]) =>
          ["quotation", "payment_schedule", "payments", "balance", "invoices"].includes(
            k,
          ) && v,
      ));
  return (
    <div className="flex flex-col gap-7">
      <Link
        href={portal ? "/portal/projects" : "/workspace/projects"}
        className="flex w-fit items-center gap-2 text-xs text-muted-foreground hover:text-link"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t("العودة للمشروعات", "Back to projects")}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1 basis-72">
          <p className="mb-2 font-mono text-xs text-link" dir="ltr">
            {p.code}
          </p>
          <h1 className="text-3xl font-medium">{p.name}</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <UserRound className="size-3.5 shrink-0" />
              {p.client_name ||
                data.clients.find((c) => c.id === p.client_id)?.name ||
                t("العميل")}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              {p.location}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" />
              {date(p.due_date)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {p.stage !== undefined && (
            <Badge variant="secondary">{stages[p.stage]}</Badge>
          )}
          {admin && (
            <Button variant="outline" onClick={() => setEdit(true)}>
              {t("تعديل")}
            </Button>
          )}
          {!portal &&
            (admin || ownsStage) &&
            p.stage !== undefined &&
            p.stage < 9 && (
              <Button onClick={() => setAdvance(true)}>
                {t("تسليم المرحلة", "Complete stage")}
                <ArrowUpLeft data-icon="inline-end" />
              </Button>
            )}
        </div>
      </div>
      {p.stage !== undefined && (
        <div
          className="overflow-x-auto border-y bg-card py-5"
          role="region"
          aria-label={t("مراحل المشروع", "Project stages")}
          tabIndex={0}
        >
          <ol className="flex min-w-[920px] justify-between gap-3 px-5">
            {stages.map((s, i) => (
              <li key={s} className="flex flex-1 flex-col gap-2">
                <div
                  className={`flex size-7 items-center justify-center rounded-full text-[11px] ${i === p.stage ? "bg-primary text-primary-foreground ring-1 ring-input" : i < (p.stage ?? 0) ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {i + 1}
                </div>
                <span
                  className={`max-w-24 text-[10px] leading-5 ${i === p.stage ? "font-medium" : "text-muted-foreground"}`}
                >
                  {s}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <Tabs defaultValue="overview">
        <TabsList className="mb-2 w-full">
          <TabsTrigger value="overview">{t("نظرة عامة")}</TabsTrigger>
          <TabsTrigger value="documents">{t("المستندات")}</TabsTrigger>
          {showFinance && (
            <TabsTrigger value="finance">{t("المالية", "Finance")}</TabsTrigger>
          )}
          <TabsTrigger value="reports">
            {t("تقارير الإشراف", "Site reports")}
          </TabsTrigger>
          {!portal && <TabsTrigger value="tasks">{t("المهام")}</TabsTrigger>}
          {isManager && (
            <TabsTrigger value="permissions">
              {t("صلاحيات العميل", "Client permissions")}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="overview">
          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <section className="app-panel">
              <h2 className="mb-5">{t("عن المشروع", "About this project")}</h2>
              <p className="whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
                {p.description ||
                  t(
                    "لم يُضف وصف للمشروع بعد.",
                    "No project description has been added yet.",
                  )}
              </p>
              {p.contract_value !== undefined && (
                <div className="mt-6 border-t pt-5">
                  <p className="text-xs text-muted-foreground">
                    {t("قيمة التعاقد", "Contract value")}
                  </p>
                  <p className="mt-2 text-2xl">{money(p.contract_value)}</p>
                </div>
              )}
              {admin && (
                <div className="mt-8">
                  <h3 className="mb-4 font-medium">
                    {t("إسناد مرحلة لموظف", "Assign a stage")}
                  </h3>
                  <ActionForm
                    onSubmit={(f) =>
                      command("assign", {
                        ...formObject(f),
                        project_id: id,
                        stage: Number(f.get("stage")),
                      })
                    }
                    submitLabel={t("إسناد المهمة", "Assign stage")}
                  >
                    <SelectField
                      label={t("المرحلة", "Stage")}
                      name="stage"
                      defaultValue={String(p.stage ?? 1)}
                      options={stages
                        .map((s, i) => ({ value: String(i), label: s }))
                        .filter((o) =>
                          [1, 2, 3, 4, 7].includes(Number(o.value)),
                        )}
                    />
                    <SelectField
                      label={t("الموظف", "Employee")}
                      name="user_id"
                      options={data.users
                        .filter((u) => u.role !== "client" && u.active)
                        .map((u) => ({
                          value: u.id,
                          label: `${u.name} · ${roles[u.role]}`,
                        }))}
                    />
                  </ActionForm>
                </div>
              )}
            </section>
            <div className="flex flex-col gap-6">
              {!portal && (
                <section className="app-panel">
                  <h2 className="mb-5">{t("فريق المشروع", "Project team")}</h2>
                  {assignments.length ? (
                    <div className="flex flex-col gap-4">
                      {assignments.map((a) => (
                        <div key={a.id} className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-accent">
                            <UserRound className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm">
                              {a.user_name ||
                                data.users.find((u) => u.id === a.user_id)
                                  ?.name ||
                                "—"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {stages[a.stage]}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t(
                        "لم تُسند مراحل المشروع بعد.",
                        "No stages assigned yet.",
                      )}
                    </p>
                  )}
                </section>
              )}
              <section className="app-panel">
                <h2 className="mb-5">
                  {t("تاريخ المشروع", "Project history")}
                </h2>
                {history.length ? (
                  <div className="flex flex-col gap-5">
                    {history.slice(0, 12).map((a) => (
                      <div
                        key={a.id}
                        className="border-s-2 border-primary ps-4"
                      >
                        <p className="text-sm">
                          {a.actor_name} · {a.action}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {date(a.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("لا توجد تحديثات متاحة.", "No updates are available.")}
                  </p>
                )}
              </section>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="documents">
          <ProjectDocuments project={p} portal={portal} />
        </TabsContent>
        {showFinance && (
          <TabsContent value="finance">
            <ProjectFinance project={p} portal={portal} />
          </TabsContent>
        )}
        <TabsContent value="reports">
          <ProjectReports project={p} portal={portal} />
        </TabsContent>
        {!portal && (
          <TabsContent value="tasks">
            <section className="app-panel">
              <h2 className="mb-5">{t("مهام المشروع", "Project tasks")}</h2>
              {projectTasks.length ? (
                projectTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 border-b py-4"
                  >
                    <p>{task.title}</p>
                    <Badge variant="secondary">{task.status}</Badge>
                  </div>
                ))
              ) : (
                <NoData
                  title={t(
                    "لا توجد مهام لهذا المشروع",
                    "No tasks for this project",
                  )}
                />
              )}
            </section>
          </TabsContent>
        )}
        {isManager && (
          <TabsContent value="permissions">
            <ProjectPermissions project={p} />
          </TabsContent>
        )}
      </Tabs>
      <FormDialog
        open={edit}
        onOpenChange={setEdit}
        title={t("تعديل المشروع", "Edit project")}
      >
        <ActionForm
          onSubmit={(f) => command("update_project", { ...formObject(f), id })}
          onSuccess={() => setEdit(false)}
        >
          <TextField
            label={t("اسم المشروع", "Project name")}
            name="name"
            defaultValue={p.name}
            required
          />
          <TextField
            label={t("موقع المشروع", "Project location")}
            name="location"
            defaultValue={p.location}
            required
          />
          <TextField
            label={t("موعد التسليم", "Due date")}
            name="due_date"
            type="date"
            defaultValue={p.due_date?.slice(0, 10) || ""}
          />
          <AreaField
            label={t("وصف المشروع", "Project description")}
            name="description"
            defaultValue={p.description}
          />
        </ActionForm>
      </FormDialog>
      <FormDialog
        open={advance}
        onOpenChange={setAdvance}
        title={t("تسليم المرحلة الحالية", "Complete the current stage")}
        description={t(
          "يتم التحقق من المخرجات المطلوبة قبل الانتقال. العملية تُسجل في تاريخ المشروع.",
          "Required outputs are checked before advancing. This action is recorded in project history.",
        )}
      >
        <p className="mb-2 text-sm leading-7">
          {t("المرحلة الحالية:", "Current stage:")} {stages[p.stage ?? 0]}
          <br />
          {t("المرحلة التالية:", "Next stage:")} {stages[(p.stage ?? 0) + 1]}
        </p>
        <ActionForm
          onSubmit={() =>
            command("transition", { project_id: id, version: p.version })
          }
          onSuccess={() => setAdvance(false)}
          submitLabel={t("تأكيد التسليم", "Confirm completion")}
        >
          <p className="text-xs text-muted-foreground">
            {t(
              "تأكد من رفع مستندات المرحلة وإتمام الموافقات اللازمة.",
              "Ensure all stage documents are uploaded and required approvals are complete.",
            )}
          </p>
        </ActionForm>
      </FormDialog>
      {admin && [5, 8].includes(p.stage ?? -1) && (
        <MunicipalityDecision project={p} />
      )}
    </div>
  );
}
function MunicipalityDecision({ project }: { project: Project }) {
  const { command } = usePlatform(),
    { t } = usePreferences(),
    { stages } = useLabels();
  const [decision, setDecision] = useState("approved");
  return (
    <section className="app-panel">
      <h2 className="mb-5">
        {project.stage === 8
          ? t("نتيجة طلب إنهاء الإشراف", "Supervision closure decision")
          : t("تسجيل قرار البلدية", "Record municipality decision")}
      </h2>
      <ActionForm
        onSubmit={(f) =>
          command(
            project.stage === 8 ? "closure_decision" : "municipality_decision",
            {
              ...formObject(f),
              project_id: project.id,
              return_stage:
                decision === "approved"
                  ? undefined
                  : Number(f.get("return_stage")),
            },
          )
        }
      >
        <SelectField
          label={t("القرار", "Decision")}
          name="decision"
          defaultValue="approved"
          onChange={setDecision}
          options={[
            { value: "approved", label: t("قبول الطلب", "Approved") },
            { value: "rejected", label: t("رفض الطلب", "Rejected") },
            {
              value: "needs_correction",
              label: t("تعديلات مطلوبة", "Needs correction"),
            },
          ]}
        />
        {decision !== "approved" && (
          <SelectField
            label={t("إرجاع المشروع إلى مرحلة", "Return project to stage")}
            name="return_stage"
            options={stages
              .map((s, i) => ({ value: String(i), label: s }))
              .filter((o) =>
                project.stage === 8
                  ? Number(o.value) === 7
                  : Number(o.value) >= 1 && Number(o.value) < 5,
              )}
          />
        )}
        <AreaField
          label={t("سبب القرار والملاحظات", "Decision reason and notes")}
          name="reason"
          required
          maxLength={4000}
        />
      </ActionForm>
    </section>
  );
}
