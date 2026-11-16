"use client";
import { usePreferences, englishRoles } from "./preferences";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  UsersRound,
  Wallet,
  ChartNoAxesCombined,
  ClipboardList,
  Files,
  HardHat,
  Landmark,
  MessageCircle,
  ShieldCheck,
  PanelsTopLeft,
  Inbox,
  LogOut,
  Menu,
  Moon,
  Sun,
  ArrowUpLeft,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { roleLabels, type Role } from "@/lib/types";
import { usePlatform } from "./provider";
const admin: Role[] = ["manager", "secretary"],
  finance: Role[] = [...admin, "accountant"];
export const navigation: {
  key: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
}[] = [
  { key: "", label: "نظرة عامة", icon: LayoutDashboard },
  { key: "projects", label: "المشروعات", icon: FolderKanban },
  { key: "clients", label: "العملاء", icon: UsersRound, roles: admin },
  { key: "tasks", label: "المهام", icon: ClipboardList },
  { key: "files", label: "المستندات", icon: Files },
  {
    key: "finance",
    label: "المالية وعروض الأسعار",
    icon: Wallet,
    roles: finance,
  },
  { key:"accounting", label:"حسابات المكتب", icon:Wallet, roles:["manager","accountant"] },
  { key:"reports", label:"تقارير المدير", icon:ChartNoAxesCombined, roles:["manager"] },
  {
    key: "municipality",
    label: "معاملات البلدية",
    icon: Landmark,
    roles: admin,
  },
  {
    key: "supervision",
    label: "الإشراف الميداني",
    icon: HardHat,
    roles: [...admin, "site_supervisor"],
  },
  { key: "team", label: "فريق العمل", icon: UsersRound, roles: admin },
  {
    key: "whatsapp",
    label: "إدارة واتساب",
    icon: MessageCircle,
    roles: ["manager"],
  },
  { key: "inquiries", label: "طلبات التواصل", icon: Inbox, roles: admin },
  {
    key: "portfolio",
    label: "سابقة الأعمال",
    icon: PanelsTopLeft,
    roles: ["manager"],
  },
  {
    key: "audit",
    label: "سجل العمليات",
    icon: ShieldCheck,
    roles: ["manager"],
  },
  { key: "settings", label: "الحساب والإعدادات", icon: Settings },
];
export function Shell({
  children,
  portal = false,
}: {
  children: ReactNode;
  portal?: boolean;
}) {
  const { t, locale, theme, toggleLocale, toggleTheme } = usePreferences();
  const { data } = usePlatform(),
    path = usePathname(),
    [open, setOpen] = useState(false);
  const router = useRouter();
  const base = portal ? "/portal" : "/workspace";
  const items = portal
    ? navigation.filter((n) =>
        ["", "projects", "files", "settings"].includes(n.key),
      )
    : navigation.filter((n) => !n.roles || n.roles.includes(data.user.role));
  const current = path.slice(base.length).split("/")[1] || "";
  const title = items.find((n) => n.key === current)?.label || "تفاصيل المشروع";
  const menu = (
    <div className="flex h-full min-h-0 flex-col">
      <Link href="/" className="flex shrink-0 items-center gap-3 border-b px-6 py-6">
        <Image
          src="/logo.png"
          width={38}
          height={44}
          alt={t("مودرن")}
          className="h-12 w-auto"
        />
        <div>
          <span className="text-2xl font-medium">{t("مودرن")}</span>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {t("للاستشارات الهندسية")}
          </p>
        </div>
      </Link>
      <div className="px-6 pt-6 pb-3 text-[11px] text-muted-foreground">
        {portal ? t("بوابة العميل") : t("إدارة المكتب")}
      </div>
      <nav
        aria-label={t("القائمة الرئيسية")}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-5"
      >
        {items.map((n) => (
          <Link
            key={n.key}
            href={`${base}${n.key ? `/${n.key}` : ""}`}
            onClick={() => setOpen(false)}
            aria-current={current === n.key ? "page" : undefined}
            className={`flex min-h-12 items-center gap-3 border-s-2 px-4 py-3 text-sm transition-colors ${current === n.key ? "border-link bg-accent font-medium text-accent-foreground" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <n.icon className="size-[18px] shrink-0" />
            {t(n.label)}
            {n.key === "inquiries" &&
              data.inquiries.filter((i) => i.status === "new").length > 0 && (
                <span className="ms-auto flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {data.inquiries.filter((i) => i.status === "new").length}
                </span>
              )}
          </Link>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-3 border-t p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-accent text-accent-foreground">
          {data.user.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{data.user.name}</p>
          <p className="text-xs text-muted-foreground">
            {locale === "ar"
              ? roleLabels[data.user.role]
              : englishRoles[data.user.role]}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="px-0!"
          aria-label={t("تسجيل الخروج")}
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.replace("/login");
            router.refresh();
          }}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </div>
  );
  return (
    <div className="min-h-dvh">
      <a
        href="#workspace-main"
        className="sr-only z-70 focus:not-sr-only focus:fixed focus:start-5 focus:top-5 focus:bg-card focus:p-4"
      >
        {t("تخطي إلى المحتوى")}
      </a>
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 border-e bg-card lg:block">
        {menu}
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          showCloseButton={false}
          side={locale === "ar" ? "right" : "left"}
          className="w-72 gap-0 p-0"
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t("قائمة مساحة العمل")}</SheetTitle>
            <SheetDescription>{t("التنقل بين أقسام المكتب")}</SheetDescription>
          </SheetHeader>
          <SheetClose
            render={
              <Button
                variant="ghost"
                size="icon"
                className="absolute end-3 top-3"
                aria-label={t("إغلاق القائمة", "Close navigation")}
              />
            }
          >
            <X aria-hidden="true" />
          </SheetClose>
          {menu}
        </SheetContent>
      </Sheet>
      <div className="lg:ms-64">
        <header className="no-print flex min-h-20 items-center justify-between gap-2 border-b bg-card px-4 sm:gap-4 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              className="px-0! lg:hidden"
              size="icon"
              variant="ghost"
              aria-label={t("فتح القائمة")}
              onClick={() => setOpen(true)}
            >
              <Menu />
            </Button>
            <p className="truncate text-sm text-muted-foreground">
              <span className="hidden sm:inline">
                {portal ? t("بوابة العميل") : t("مساحة العمل")}
                <span aria-hidden="true" className="px-3 text-muted-foreground">/</span>
              </span>
              <span className="text-foreground">{t(title)}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLocale}
              aria-label={t("التبديل إلى الإنجليزية", "Switch to Arabic")}
            >
              {locale === "ar" ? "EN" : "ع"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="px-0!"
              aria-label={
                theme === "dark"
                  ? t("الوضع الفاتح", "Light mode")
                  : t("الوضع الداكن", "Dark mode")
              }
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
            <Link
              href="/"
              className="hidden items-center gap-2 text-xs text-muted-foreground hover:text-link sm:flex"
            >
              {t("الموقع التعريفي")}
              <ArrowUpLeft className="size-4" />
            </Link>
          </div>
        </header>
        <main
          id="workspace-main"
          className="workspace-main mx-auto max-w-[1420px] p-4 pb-24 sm:p-6 sm:pb-24 xl:p-8 xl:pb-24"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
