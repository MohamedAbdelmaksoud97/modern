"use client";
import { useState } from "react";
import { usePreferences } from "@/components/platform/preferences";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, Menu, Moon, Sun, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
export function LandingHeader() {
  const { t, locale, theme, toggleLocale, toggleTheme } = usePreferences();
  const navigation = [
    { href: "#about", label: t("عن مودرن", "About Modern") },
    { href: "#services", label: t("خدماتنا", "Our services") },
    { href: "#work", label: t("أعمالنا", "Our work") },
    { href: "#contact", label: t("تواصل معنا", "Contact us") },
  ];
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-[1420px] items-center justify-between gap-4 px-4 py-5 md:px-6 lg:px-10">
        <Link
          href="/"
          aria-label={t("مودرن، الصفحة الرئيسية", "Modern, home page")}
          className="flex shrink-0 items-center gap-3"
        >
          <Image
            src="/logo.png"
            alt=""
            width={43}
            height={53}
            className="h-12 w-auto lg:h-14"
          />
          <div className="flex flex-col gap-1">
            <span className="text-lg font-medium">
              <span className="sm:hidden">{t("مودرن", "Modern")}</span>
              <span className="hidden sm:inline">
                {t("مكتب مودرن", "Modern Office")}
              </span>
            </span>
            <span className="hidden text-[10px] text-muted-foreground sm:inline">
              {t("للاستشارات الهندسية", "Engineering Consultancy")}
            </span>
          </div>
        </Link>
        <nav
          aria-label={t("التنقل الرئيسي", "Main navigation")}
          className="hidden items-center gap-6 xl:flex"
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex min-h-12 items-center text-sm text-muted-foreground underline-offset-8 transition-colors hover:text-foreground hover:underline"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <div className="hidden items-center gap-2 xl:flex">
            <Button nativeButton={false} variant="ghost" render={<Link href="/login" />}>
              <UserRound data-icon="inline-start" aria-hidden="true" />
              {t("بوابة العملاء", "Client portal")}
            </Button>
            <Button nativeButton={false} render={<a href="#contact" />}>
              {t("ابدأ مشروعك", "Start your project")}
              <ArrowUpLeft data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLocale}
            aria-label={t("التبديل إلى الإنجليزية", "Switch to Arabic")}
            title={t("التبديل إلى الإنجليزية", "Switch to Arabic")}
          >
            <span aria-hidden="true">{locale === "ar" ? "EN" : "ع"}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={
              theme === "light"
                ? t("تفعيل الوضع الداكن", "Enable dark mode")
                : t("تفعيل الوضع الفاتح", "Enable light mode")
            }
            title={
              theme === "light"
                ? t("تفعيل الوضع الداكن", "Enable dark mode")
                : t("تفعيل الوضع الفاتح", "Enable light mode")
            }
          >
            {theme === "light" ? (
              <Moon aria-hidden="true" />
            ) : (
              <Sun aria-hidden="true" />
            )}
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="xl:hidden"
                  aria-label={t("فتح قائمة التنقل", "Open navigation")}
                />
              }
            >
              <Menu aria-hidden="true" />
            </SheetTrigger>
            <SheetContent
              side={locale === "ar" ? "right" : "left"}
              showCloseButton={false}
              dir={locale === "ar" ? "rtl" : "ltr"}
              className="overflow-y-auto"
            >
              <SheetHeader className="px-6 pb-6 pt-8">
                <div className="flex items-start justify-between gap-3">
                  <SheetTitle>{t("مكتب مودرن", "Modern Office")}</SheetTitle>
                  <SheetClose
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("إغلاق القائمة", "Close navigation")}
                      />
                    }
                  >
                    <X aria-hidden="true" />
                  </SheetClose>
                </div>
                <SheetDescription>
                  {t("للاستشارات الهندسية", "Engineering Consultancy")}
                </SheetDescription>
              </SheetHeader>
              <nav
                aria-label={t("قائمة التنقل", "Navigation menu")}
                className="flex flex-col px-6"
              >
                {navigation.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-14 items-center justify-between border-b border-border py-4 text-base"
                  >
                    {item.label}
                    <ArrowUpLeft className="size-4" aria-hidden="true" />
                  </a>
                ))}
              </nav>
              <div className="flex flex-wrap gap-2 px-6">
                <Button variant="outline" onClick={toggleLocale}>
                  {locale === "ar" ? "English" : "العربية"}
                </Button>
                <Button variant="outline" onClick={toggleTheme}>
                  {theme === "light"
                    ? t("الوضع الداكن", "Dark mode")
                    : t("الوضع الفاتح", "Light mode")}
                </Button>
              </div>
              <div className="mt-auto flex flex-col gap-3 p-6">
                <Button
                  nativeButton={false}
                  render={<a href="#contact" onClick={() => setOpen(false)} />}
                >
                  {t("ابدأ مشروعك", "Start your project")}
                  <ArrowUpLeft data-icon="inline-end" aria-hidden="true" />
                </Button>
                <Button nativeButton={false} variant="outline" render={<Link href="/login" />}>
                  {t("بوابة العملاء وفريق العمل", "Client & team portal")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
