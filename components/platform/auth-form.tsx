"use client";

import { usePreferences } from "./preferences";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField, ActionForm, formObject } from "./forms";

export function AuthForm({
  changePassword = false,
}: {
  changePassword?: boolean;
}) {
  const { t, locale, theme, toggleLocale, toggleTheme } = usePreferences();
  const [visible, setVisible] = useState(false);

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative flex items-center justify-center px-5 pb-16 pt-28">
        <div className="absolute inset-x-5 top-5 flex items-center justify-between gap-2 sm:inset-x-6">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="size-4 ltr:rotate-180" aria-hidden="true" />
            {t("العودة إلى الموقع", "Back to website")}
          </Link>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLocale}
              aria-label={t("التبديل إلى الإنجليزية", "Switch to Arabic")}
              title={t("التبديل إلى الإنجليزية", "Switch to Arabic")}
            >
              {locale === "ar" ? "EN" : "ع"}
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
          </div>
        </div>
        <div className="w-full max-w-md">
          <Image
            src="/logo.png"
            width={68}
            height={78}
            alt={t("مودرن", "Modern")}
            className="mb-8 h-20 w-auto"
          />
          <p className="section-label mb-3">
            {t(
              "مكتب مودرن للاستشارات الهندسية",
              "Modern Engineering Consultancy",
            )}
          </p>
          <h1 className="mb-3 text-3xl font-medium">
            {changePassword
              ? t("تغيير كلمة المرور", "Change password")
              : t("مرحبًا بك في مودرن", "Welcome to Modern")}
          </h1>
          <p className="mb-8 leading-7 text-muted-foreground">
            {changePassword
              ? t(
                  "اختر كلمة مرور جديدة لحماية حسابك. يجب تغيير كلمة المرور الأولية قبل متابعة استخدام المنصة.",
                  "Choose a new password to protect your account. Change your temporary password before continuing.",
                )
              : t(
                  "مساحة واحدة تجمع تفاصيل مشروعك، وفريق العمل، وكل خطوة نحو الإنجاز.",
                  "One place for your project, your team and every step toward completion.",
                )}
          </p>
          <ActionForm
            submitLabel={
              changePassword
                ? t("حفظ كلمة المرور", "Save password")
                : t("تسجيل الدخول", "Sign in")
            }
            onSubmit={async (form) => {
              try {
                const response = await fetch(
                  changePassword ? "/api/auth/password" : "/api/auth/login",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formObject(form)),
                  },
                );
                const result = await response.json().catch(() => null);
                if (!response.ok || !result?.ok) {
                  let error = "تعذر إتمام العملية. حاول مجددًا.";
                  if (response.status === 429)
                    error = "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.";
                  else if (response.status === 401)
                    error = changePassword
                      ? "انتهت الجلسة. سجّل دخولك من جديد."
                      : "بيانات الدخول غير صحيحة";
                  else if (changePassword && response.status === 400)
                    error =
                      "تحقق من كلمة المرور الحالية، واختر كلمة مرور جديدة مختلفة لا تقل عن 12 حرفًا.";
                  return { ok: false, error };
                }
                window.location.assign(result.redirect || "/workspace");
                return result;
              } catch {
                return {
                  ok: false,
                  error:
                    "تعذر الاتصال بالخادم. تحقق من الاتصال ثم أعد المحاولة.",
                };
              }
            }}
          >
            {!changePassword && (
              <TextField
                label={t(
                  "البريد الإلكتروني أو رقم الهوية",
                  "Email address or national ID",
                )}
                name="identifier"
                required
                autoComplete="username"
                dir="auto"
                placeholder={t(
                  "البريد للموظف · رقم الهوية للعميل",
                  "Staff email · Client national ID",
                )}
                maxLength={160}
              />
            )}
            <div className="relative">
              <TextField
                label={
                  changePassword
                    ? t("كلمة المرور الحالية", "Current password")
                    : t("كلمة المرور", "Password")
                }
                name={changePassword ? "current_password" : "password"}
                type={visible ? "text" : "password"}
                required
                autoComplete="current-password"
                maxLength={128}
                className="pe-14"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute end-1 bottom-0 min-w-12 px-0!"
                aria-label={
                  visible
                    ? t("إخفاء كلمة المرور", "Hide password")
                    : t("إظهار كلمة المرور", "Show password")
                }
                onClick={() => setVisible(!visible)}
              >
                {visible ? (
                  <EyeOff aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
              </Button>
            </div>
            {changePassword && (
              <TextField
                label={t("كلمة المرور الجديدة", "New password")}
                name="new_password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                hint={t(
                  "12 حرفًا على الأقل. اختر كلمة مختلفة عن كلمة المرور الحالية.",
                  "At least 12 characters. Choose a password different from your current password.",
                )}
              />
            )}
            {!changePassword && (
              <p className="text-sm leading-6 text-muted-foreground">
                {t(
                  "بيانات الدخول تصدرها إدارة المكتب. لاستعادة حسابك، تواصل مع السكرتارية.",
                  "Your account is issued by the office. Contact the secretary for account recovery.",
                )}
              </p>
            )}
          </ActionForm>
          <div className="mt-8 flex items-center gap-2 border-t pt-5 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            {t(
              "مساحة خاصة وآمنة لعملاء وموظفي المكتب",
              "A private workspace for our clients and team",
            )}
          </div>
        </div>
      </section>
      <aside className="relative hidden overflow-hidden bg-inverse text-inverse-foreground lg:flex lg:flex-col lg:justify-end lg:p-16 dark:bg-card dark:text-card-foreground">
        <div
          className="pointer-events-none absolute inset-12 opacity-30"
          aria-hidden="true"
        >
          <div className="absolute start-12 top-0 h-[75%] w-3/5 border border-primary" />
          <div className="absolute end-0 top-24 h-[75%] w-3/5 border border-primary" />
          <div className="absolute inset-x-0 top-1/2 border-t border-primary" />
          <div className="absolute start-1/2 inset-y-0 border-s border-primary" />
        </div>
        <div className="relative">
          <p className="mb-5 text-xs text-primary">
            {t("مودرن للاستشارات الهندسية", "MODERN ENGINEERING CONSULTANCY")}
          </p>
          <h2 className="max-w-md text-4xl leading-normal">
            {t("تفاصيل مدروسة.", "Considered details.")}
            <br />
            {t("رؤية تُبنى على الثقة.", "A vision built on trust.")}
          </h2>
          <p className="mt-6 max-w-sm leading-8 opacity-80">
            {t(
              "من أول فكرة إلى آخر تفصيلة في الموقع، نرافق مشروعك بخبرة هندسية ووضوح في كل مرحلة.",
              "From the first idea to the final site detail, we guide your project with engineering expertise and clarity at every stage.",
            )}
          </p>
        </div>
      </aside>
    </main>
  );
}
