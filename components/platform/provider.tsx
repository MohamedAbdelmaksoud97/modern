"use client";
import { usePreferences } from "./preferences";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDialog, ErrorNotice } from "./forms";
import type { PlatformData, CommandResult } from "@/lib/types";
type Context = {
  data: PlatformData;
  refresh: () => Promise<void>;
  command: (
    action: string,
    payload?: Record<string, unknown>,
  ) => Promise<CommandResult>;
  notify: (text: string) => void;
};
const PlatformContext = createContext<Context | null>(null);
export function usePlatform() {
  const value = useContext(PlatformContext);
  if (!value) throw new Error("Platform context missing");
  return value;
}
export function PlatformProvider({ children }: { children: ReactNode }) {
  const { t } = usePreferences();
  const router = useRouter();
  const [data, setData] = useState<PlatformData | null>(null),
    [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [credentials, setCredentials] = useState<CommandResult["credentials"]>();
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (res.status === 403) {
        const result = await res.json();
        if (result.code === "PASSWORD_CHANGE_REQUIRED") {
          router.replace("/change-password");
          return;
        }
        throw new Error("ليست لديك صلاحية الوصول");
      }
      if (!res.ok) throw new Error("تعذر تحميل بيانات المكتب. أعد المحاولة.");
      const json = await res.json();
      if (json.user.must_change_password) {
        router.replace("/change-password");
        return;
      }
      setData(json);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error &&
          !(e instanceof TypeError) &&
          !(e instanceof SyntaxError)
          ? e.message
          : "تعذر الاتصال بالخادم",
      );
    }
  }, [router]);
  useEffect(() => {
    const task = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(task);
  }, [refresh]);
  async function command(
    action: string,
    payload: Record<string, unknown> = {},
  ) {
    try {
      const res = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const result = await res.json();
      if (res.status === 401) {
        router.replace("/login");
        return { ok: false, error: "انتهت الجلسة. سجّل دخولك من جديد." };
      }
      if (!res.ok || !result.ok)
        return { ok: false, error: result.error || "تعذر إتمام العملية" };
      if (result.credentials) setCredentials(result.credentials);
      setNotice("تم حفظ التغييرات بنجاح");
      await refresh();
      return result;
    } catch {
      return {
        ok: false,
        error: "تعذر الاتصال بالخادم. تحقق من الاتصال ثم أعد المحاولة.",
      };
    }
  }
  if (!data)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-5">
        <LoaderCircle className="size-8 animate-spin text-link" />
        <p>{t("جارٍ تحميل مساحة العمل…", "Loading your workspace…")}</p>
        <div className="w-full max-w-lg">
          <ErrorNotice error={error} />
        </div>
        {error && (
          <Button onClick={() => void refresh()}>
            {t("إعادة المحاولة", "Try again")}
          </Button>
        )}
      </main>
    );
  return (
    <PlatformContext value={{ data, refresh, command, notify: setNotice }}>
      {error && (
        <div className="fixed inset-x-4 top-4 z-60">
          <ErrorNotice error={error} />
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="fixed bottom-5 inset-x-4 z-60 mx-auto flex w-fit max-w-[calc(100%-32px)] items-center gap-3 border border-border bg-card px-5 py-3 shadow-md"
        >
          <CheckCircle2 className="size-5 shrink-0 text-success" />
          <span>{t(notice)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="px-0!"
            aria-label={t("إغلاق التنبيه")}
            onClick={() => setNotice("")}
          >
            <X />
          </Button>
        </div>
      )}
      {children}
      <FormDialog
        open={!!credentials}
        onOpenChange={(open) => {
          if (!open) setCredentials(undefined);
        }}
        title={t("بيانات الدخول الجديدة")}
        description={t(
          "تظهر كلمة المرور مرة واحدة. سلّمها لصاحب الحساب بطريقة آمنة، وسيُطلب منه تغييرها عند أول دخول.",
        )}
      >
        <div className="flex flex-col gap-3 rounded-md bg-muted p-5">
          <p>
            {t("اسم المستخدم:")}
            <bdi className="select-all font-mono">{credentials?.username}</bdi>
          </p>
          <p>
            {t("كلمة المرور:")}
            <bdi className="select-all font-mono">{credentials?.password}</bdi>
          </p>
        </div>
        <Button onClick={() => setCredentials(undefined)}>
          {t("تم استلام البيانات")}
        </Button>
      </FormDialog>
    </PlatformContext>
  );
}
