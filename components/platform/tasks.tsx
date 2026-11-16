"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, CalendarDays, UserRound, ArrowUpLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlatform } from "./provider";
import { usePreferences } from "./preferences";
import {
  FormDialog,
  ActionForm,
  TextField,
  SelectField,
  NoData,
  formObject,
  date,
} from "./forms";
export function Tasks() {
  const { data, command } = usePlatform(),
    { t } = usePreferences(),
    [open, setOpen] = useState(false);
  const admin = ["manager", "secretary"].includes(data.user.role);
  const statuses = [
    { value: "pending", label: t("في الانتظار", "Pending") },
    { value: "in_progress", label: t("قيد التنفيذ", "In progress") },
    { value: "completed", label: t("مكتملة", "Completed") },
  ];
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label mb-2">
            {t("تنظيم يوم العمل", "ORGANIZE YOUR DAY")}
          </p>
          <h1 className="text-3xl font-medium">{t("المهام")}</h1>
        </div>
        {admin && (
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            {t("مهمة جديدة", "New task")}
          </Button>
        )}
      </div>
      {data.tasks.length ? (
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-3">
          {statuses.map((status) => (
            <section key={status.value} className="min-w-0 border bg-muted/40 p-4">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-medium">{status.label}</h2>
                <Badge variant="outline">
                  {
                    data.tasks.filter((task) => task.status === status.value)
                      .length
                  }
                </Badge>
              </div>
              <div className="flex flex-col gap-3">
                {data.tasks
                  .filter((task) => task.status === status.value)
                  .map((task) => (
                    <article key={task.id} className="min-w-0 border bg-card p-4">
                      <Link
                        href={`/workspace/projects/${task.project_id}`}
                        className="flex items-center justify-between gap-2 text-xs text-link"
                      >
                        {data.projects.find((p) => p.id === task.project_id)
                          ?.name || t("المشروع", "Project")}
                        <ArrowUpLeft className="size-3.5 shrink-0" />
                      </Link>
                      <h3 className="my-4 leading-7">{task.title}</h3>
                      <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <UserRound className="size-3.5" />
                        {data.users.find((u) => u.id === task.assigned_to)
                          ?.name || data.user.name}
                      </p>
                      <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="size-3.5" />
                        {date(task.due_date)}
                      </p>
                      <ActionForm
                        submitLabel={t("تحديث", "Update")}
                        onSubmit={(f) =>
                          command("update_task", {
                            id: task.id,
                            status: f.get("status"),
                          })
                        }
                      >
                        <SelectField
                          label={t("حالة المهمة", "Task status")}
                          name="status"
                          defaultValue={task.status}
                          options={statuses}
                        />
                      </ActionForm>
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <NoData
          title={t("لا توجد مهام بعد", "No tasks yet")}
          description={t(
            "تُسند المهام للموظفين المرتبطين بالمشروع، وتظهر هنا حسب حالتها.",
            "Tasks are assigned to project team members and organized here by status.",
          )}
        />
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t("مهمة جديدة", "New task")}
      >
        <ActionForm
          onSubmit={(f) => command("create_task", formObject(f))}
          onSuccess={() => setOpen(false)}
        >
          <TextField
            label={t("عنوان المهمة", "Task title")}
            name="title"
            required
            maxLength={200}
          />
          <SelectField
            label={t("المشروع", "Project")}
            name="project_id"
            options={data.projects.map((p) => ({ value: p.id, label: p.name }))}
          />
          <SelectField
            label={t("الموظف المسؤول", "Assigned employee")}
            name="assigned_to"
            options={data.users
              .filter((u) => u.role !== "client" && u.active)
              .map((u) => ({ value: u.id, label: u.name }))}
          />
          <TextField
            label={t("موعد التسليم", "Due date")}
            name="due_date"
            type="date"
          />
        </ActionForm>
      </FormDialog>
    </div>
  );
}
