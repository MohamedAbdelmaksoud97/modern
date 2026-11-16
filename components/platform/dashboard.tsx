"use client";

import { usePreferences, englishStages } from "./preferences";
import Link from "next/link";
import {
  ArrowUpLeft,
  FolderKanban,
  HardHat,
  Wallet,
  Clock3,
  Plus,
  CheckCircle2,
  Files,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { stageLabels, type Audit } from "@/lib/types";
import { usePlatform } from "./provider";
import { money, date, NoData } from "./forms";

type Metric = {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  sub: string;
};
const auditNames: Record<string, [string, string]> = {
  create_client: ["إضافة عميل", "Client added"],
  update_client: ["تحديث بيانات العميل", "Client details updated"],
  create_employee: ["إضافة موظف", "Team member added"],
  update_user: ["تحديث حساب مستخدم", "User account updated"],
  reset_password: ["إعادة تعيين كلمة المرور", "Password reset"],
  password_changed: ["تغيير كلمة المرور", "Password changed"],
  create_project: ["إنشاء مشروع", "Project created"],
  update_project: ["تحديث المشروع", "Project updated"],
  assign: ["تعيين مسؤول المرحلة", "Stage owner assigned"],
  transition: [
    "انتقال المشروع إلى مرحلة جديدة",
    "Project moved to a new stage",
  ],
  municipality_decision: [
    "تسجيل قرار البلدية",
    "Municipality decision recorded",
  ],
  closure_decision: [
    "تسجيل قرار إنهاء الإشراف",
    "Supervision closure decision recorded",
  ],
  create_report: ["تسجيل تقرير إشراف", "Supervision report added"],
  document_uploaded: ["إضافة مستند", "Document uploaded"],
  create_quotation: ["إضافة عرض سعر", "Quotation added"],
  set_allocations: ["تحديث جدول الدفعات", "Payment schedule updated"],
  create_payment: ["تسجيل دفعة", "Payment recorded"],
  set_visibility: ["تحديث إعدادات ظهور العميل", "Client visibility updated"],
  create_task: ["إضافة مهمة", "Task added"],
  update_task: ["تحديث المهمة", "Task updated"],
  update_inquiry: ["تحديث طلب تواصل", "Inquiry updated"],
  save_portfolio: ["حفظ عمل في المعرض", "Portfolio entry saved"],
  delete_portfolio: ["حذف عمل من المعرض", "Portfolio entry deleted"],
};

export function Dashboard({ portal = false }: { portal?: boolean }) {
  const { t, locale } = usePreferences();
  const { data } = usePlatform();
  const stages = locale === "ar" ? stageLabels : englishStages;
  const numbers = new Intl.NumberFormat(locale === "ar" ? "ar-KW" : "en-KW");
  const base = portal ? "/portal" : "/workspace";
  const client = portal || data.user.role === "client";
  const statusProjects = data.projects.filter(
    (project) =>
      project.stage !== undefined && (!client || project.visibility?.status),
  );
  const active = statusProjects.filter((project) => project.stage !== 9);
  const finance = ["manager", "secretary", "accountant"].includes(
    data.user.role,
  );
  const metrics: Metric[] = [
    {
      key: "projects",
      label: client
        ? t("مشروعاتك", "Your projects")
        : t("إجمالي المشروعات", "Total projects"),
      value: numbers.format(data.projects.length),
      icon: FolderKanban,
      sub: client
        ? t("المشروعات المسجلة لك", "Projects registered to your account")
        : t(
            `${numbers.format(active.length)} مشروع قيد التنفيذ`,
            `${numbers.format(active.length)} active projects`,
          ),
    },
  ];

  if (client) {
    metrics.push({
      key: "documents",
      label: t("مستنداتك المشتركة", "Your shared documents"),
      value: numbers.format(data.documents.length),
      icon: Files,
      sub: t(
        "الملفات التي شاركها المكتب معك",
        "Files the office has shared with you",
      ),
    });
    const paymentProjects = new Set(
      data.projects
        .filter((project) => project.visibility?.payments)
        .map((project) => project.id),
    );
    if (paymentProjects.size) {
      const paid = data.payments
        .filter((payment) => paymentProjects.has(payment.project_id))
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      metrics.push({
        key: "payments",
        label: t("دفعاتك المسجلة", "Your recorded payments"),
        value: money(paid, locale),
        icon: Wallet,
        sub: t(
          "للمشروعات المسموح بعرض دفعاتها",
          "For projects with payment visibility enabled",
        ),
      });
    }
    const balanceProjects = data.projects.filter(
      (project) =>
        project.visibility?.balance &&
        project.balance !== undefined &&
        Number.isFinite(Number(project.balance)),
    );
    if (balanceProjects.length)
      metrics.push({
        key: "balance",
        label: t("المتبقي من التعاقدات", "Outstanding balance"),
        value: money(
          balanceProjects.reduce(
            (sum, project) => sum + Number(project.balance),
            0,
          ),
          locale,
        ),
        icon: Clock3,
        sub: t(
          "للمشروعات المسموح بعرض رصيدها",
          "For projects with balance visibility enabled",
        ),
      });
    if (statusProjects.length)
      metrics.push({
        key: "supervision",
        label: t("في الإشراف الميداني", "Under site supervision"),
        value: numbers.format(
          statusProjects.filter((project) => project.stage === 7).length,
        ),
        icon: HardHat,
        sub: t(
          "وفق حالات المشروعات المتاحة لك",
          "Based on project statuses shared with you",
        ),
      });
  } else {
    metrics.push({
      key: "supervision",
      label: t("في الإشراف الميداني", "Under site supervision"),
      value: numbers.format(
        statusProjects.filter((project) => project.stage === 7).length,
      ),
      icon: HardHat,
      sub: t("متابعة مستمرة للموقع", "Continuous site follow-up"),
    });
    if (finance) {
      const paid = data.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0,
      );
      const balances = data.projects.filter(
        (project) =>
          project.balance !== undefined &&
          Number.isFinite(Number(project.balance)),
      );
      metrics.push({
        key: "payments",
        label: t("إجمالي المحصل", "Total collected"),
        value: money(paid, locale),
        icon: Wallet,
        sub: t("دفعات مسجلة في النظام", "Recorded payments"),
      });
      metrics.push({
        key: "balance",
        label: t("المتبقي من التعاقدات", "Outstanding balance"),
        value: money(
          data.projects.length === 0
            ? 0
            : balances.length
              ? balances.reduce(
                  (sum, project) => sum + Number(project.balance),
                  0,
                )
              : undefined,
          locale,
        ),
        icon: Clock3,
        sub: t(
          "الرصيد المعتمد للمشروعات المتاحة",
          "Authoritative balances for available projects",
        ),
      });
    } else {
      metrics.push({
        key: "tasks",
        label: t("المهام المفتوحة", "Open tasks"),
        value: numbers.format(
          data.tasks.filter((task) => task.status !== "completed").length,
        ),
        icon: Clock3,
        sub: t("مهام قيد العمل", "Tasks in progress"),
      });
      metrics.push({
        key: "completed",
        label: t("مشروعات مكتملة", "Completed projects"),
        value: numbers.format(
          statusProjects.filter((project) => project.stage === 9).length,
        ),
        icon: CheckCircle2,
        sub: t("رحلة هندسية مكتملة", "Completed engineering journeys"),
      });
    }
  }

  const showStages = !client || statusProjects.length > 0;
  const activity = client
    ? data.audit.filter(
        (entry) =>
          entry.action === "transition" &&
          data.projects.some(
            (project) =>
              project.id === entry.project_id && project.visibility?.history,
          ),
      )
    : data.audit;
  function activityLabel(entry: Audit) {
    if (
      entry.action === "transition" &&
      typeof entry.details.from === "number" &&
      typeof entry.details.to === "number"
    ) {
      const from = stages[entry.details.from],
        to = stages[entry.details.to];
      if (from && to)
        return t(
          `انتقل المشروع من ${from} إلى ${to}`,
          `Project moved from ${from} to ${to}`,
        );
    }
    const label = auditNames[entry.action];
    return label
      ? t(label[0], label[1])
      : t("تحديث في المشروع", "Project updated");
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label mb-2">
            {new Intl.DateTimeFormat(locale === "ar" ? "ar-KW" : "en-KW", {
              dateStyle: "full",
              timeZone: "Asia/Kuwait",
            }).format(new Date())}
          </p>
          <h1 className="text-3xl font-medium">
            {t("أهلًا،", "Hello,")} {data.user.name.split(" ")[0]}
            <span className="text-link">.</span>
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {client
              ? t(
                  "كل تفاصيل مشروعك في مكان واحد. تابع رحلته معنا خطوة بخطوة.",
                  "All your project details in one place. Follow its journey with us, step by step.",
                )
              : t(
                  "رؤية أوضح لمشروعات المكتب، وخطوة أقرب إلى إنجازها.",
                  "A clearer view of your office projects, one step closer to completion.",
                )}
          </p>
        </div>
        {["manager", "secretary"].includes(data.user.role) && (
          <Button nativeButton={false} render={<Link href="/workspace/projects?new=1" />}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            {t("مشروع جديد", "New project")}
          </Button>
        )}
      </div>
      <div
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2",
          metrics.length > 2 && "xl:grid-cols-4",
        )}
      >
        {metrics.map((metric) => (
          <Card key={metric.key}>
            <CardHeader>
              <CardTitle>{metric.label}</CardTitle>
              <CardAction>
                <metric.icon className="size-5 text-link" aria-hidden="true" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-medium tabular-nums">
                <bdi>{metric.value}</bdi>
              </p>
            </CardContent>
            <CardFooter>
              <CardDescription>{metric.sub}</CardDescription>
            </CardFooter>
          </Card>
        ))}
      </div>
      <div
        className={cn("grid grid-cols-1 gap-6", showStages && "xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]")}
      >
        <section className="app-panel">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2>{t("المشروعات الأخيرة", "Recent projects")}</h2>
            <Link
              href={`${base}/projects`}
              className="flex items-center gap-1 text-xs text-link"
            >
              {t("عرض الكل", "View all")}
              <ArrowUpLeft
                className="size-4 ltr:rotate-90"
                aria-hidden="true"
              />
            </Link>
          </div>
          {data.projects.length === 0 ? (
            <NoData
              title={t(
                "رحلة مشروعك تبدأ من هنا",
                "Your project journey starts here",
              )}
              description={
                client
                  ? t(
                      "سيظهر مشروعك هنا عند تسجيله بواسطة المكتب.",
                      "Your project will appear here once registered by the office.",
                    )
                  : t(
                      "أضف أول عميل ومشروع لبدء تنظيم العمل داخل المكتب.",
                      "Add your first client and project to start organizing your office.",
                    )
              }
            />
          ) : (
            <div className="flex flex-col">
              {data.projects.slice(0, 6).map((project) => (
                <Link
                  key={project.id}
                  href={`${base}/projects/${project.id}`}
                  className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 border-b py-5 last:border-0 hover:bg-muted/50 sm:flex sm:gap-4"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center bg-accent text-accent-foreground">
                    <FolderKanban className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium">
                      {project.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <bdi>{project.code}</bdi> ·{" "}
                      {project.client_name ||
                        project.location ||
                        t("مودرن", "Modern")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="col-start-2 w-fit">
                    {project.stage === undefined ||
                    (client && !project.visibility?.status)
                      ? t("مشروعك", "Your project")
                      : stages[project.stage]}
                  </Badge>
                  <ArrowUpLeft
                    className="hidden size-4 text-muted-foreground ltr:rotate-90 sm:block"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
        {showStages && (
          <section className="app-panel">
            <h2 className="mb-6">
              {client
                ? t("رحلة المشروع", "Project journey")
                : t("توزيع مراحل العمل", "Workflow overview")}
            </h2>
            {client && (
              <p className="mb-5 text-xs leading-6 text-muted-foreground">
                {t(
                  "يُعرض هنا فقط ما سمح المكتب بمشاركة حالته معك.",
                  "Only projects whose status has been shared with you appear here.",
                )}
              </p>
            )}
            <div className="flex flex-col gap-5">
              {stages.slice(1, 9).map((label, index) => {
                const count = statusProjects.filter(
                  (project) => project.stage === index + 1,
                ).length;
                return (
                  <div key={label}>
                    <div className="mb-2 flex justify-between gap-3 text-xs">
                      <span>{label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {numbers.format(count)}
                      </span>
                    </div>
                    <div
                      className="h-1.5 bg-muted"
                      role="meter"
                      aria-label={label}
                      aria-valuenow={count}
                      aria-valuemin={0}
                      aria-valuemax={Math.max(statusProjects.length, 1)}
                    >
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${statusProjects.length ? (count / statusProjects.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="app-panel">
          <h2 className="mb-5">
            {client
              ? t("آخر تحديثات مشروعك", "Latest project updates")
              : t("سجل النشاط الأخير", "Recent activity")}
          </h2>
          {activity.length ? (
            <div className="flex flex-col gap-4">
              {activity.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex gap-3">
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-link"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm">
                      {entry.actor_name && <>{entry.actor_name} · </>}
                      {activityLabel(entry)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {date(entry.created_at, locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              {t(
                "لا توجد تحديثات لعرضها حاليًا.",
                "There are no updates to show yet.",
              )}
            </p>
          )}
        </div>
        <div className="flex flex-col justify-between gap-6 bg-accent p-6 text-accent-foreground">
          <div>
            <p className="mb-4 text-xs">
              {t("مودرن / مساحة العمل", "MODERN / WORKSPACE")}
            </p>
            <h2 className="text-2xl leading-relaxed">
              {t("كل مرحلة مدروسة.", "Every stage considered.")}
              <br />
              {t("كل تفصيلة محفوظة.", "Every detail preserved.")}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7">
              {t(
                "المستندات والتقارير والمراسلات مرتبطة بمشروعك، لتبقى الصورة واضحة من البداية حتى التسليم.",
                "Documents, reports and correspondence stay connected to your project, keeping the picture clear from start to handover.",
              )}
            </p>
          </div>
          <Link
            href={`${base}/files`}
            className="flex items-center gap-2 text-sm font-medium"
          >
            {t("تصفح المستندات", "Browse documents")}
            <ArrowUpLeft className="size-4 ltr:rotate-90" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
