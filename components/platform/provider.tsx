"use client";
import { usePreferences } from "./preferences";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDialog, ErrorNotice } from "./forms";
import type { PlatformData, CommandResult, User } from "@/lib/types";
import {
  emptyPlatformData,
  pageScope,
  scopeKey,
  type PlatformScope,
} from "@/lib/platform-scope";
type Context = {
  data: PlatformData;
  loading: boolean;
  error: string | null;
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
type Snapshot = { data: PlatformData; loadedAt: number };
const freshnessMs = 30_000;

export function PlatformProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: User;
}) {
  const { t } = usePreferences();
  const router = useRouter();
  const pathname = usePathname();
  const scope = pageScope(pathname);
  const key = scopeKey(scope);
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({}),
    [failures, setFailures] = useState<Record<string, string>>({}),
    [notice, setNotice] = useState(""),
    [credentials, setCredentials] = useState<CommandResult["credentials"]>();
  const cache = useRef<Record<string, Snapshot>>({});
  const inFlight = useRef(
    new Map<string, { controller: AbortController; promise: Promise<void> }>(),
  );
  const generation = useRef(0);
  const currentScope = useRef(scope);
  const currentKey = useRef(key);
  useEffect(() => {
    currentScope.current = scope;
    currentKey.current = key;
  });

  const load = useCallback(
    (target: PlatformScope, force = false): Promise<void> => {
      const targetKey = scopeKey(target);
      if (
        !force &&
        Date.now() - (cache.current[targetKey]?.loadedAt ?? 0) < freshnessMs
      )
        return Promise.resolve();
      const existing = inFlight.current.get(targetKey);
      if (existing) return existing.promise;
      const controller = new AbortController();
      const started = generation.current;
      const query = new URLSearchParams({ section: target.section });
      if (target.projectId) query.set("project_id", target.projectId);
      const promise = (async () => {
        try {
          const res = await fetch("/api/data?" + query, {
            cache: "no-store",
            signal: controller.signal,
          });
          if (controller.signal.aborted || generation.current !== started)
            return;
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
          if (!res.ok)
            throw new Error("تعذر تحميل بيانات المكتب. أعد المحاولة.");
          const json = await res.json();
          if (json.user.must_change_password) {
            router.replace("/change-password");
            return;
          }
          if (controller.signal.aborted || generation.current !== started)
            return;
          if (
            json.user.id !== initialUser.id ||
            json.user.role !== initialUser.role
          ) {
            cache.current = {};
            setSnapshots({});
            setFailures({});
            router.refresh();
            return;
          }
          const updated = {
            ...cache.current,
            [targetKey]: { data: json, loadedAt: Date.now() },
          };
          cache.current = updated;
          setSnapshots(updated);
          setFailures((prior) => {
            const remaining = { ...prior };
            delete remaining[targetKey];
            return remaining;
          });
        } catch (e) {
          if (controller.signal.aborted || generation.current !== started)
            return;
          setFailures((prior) => ({
            ...prior,
            [targetKey]:
              e instanceof Error &&
              !(e instanceof TypeError) &&
              !(e instanceof SyntaxError)
                ? e.message
                : "تعذر الاتصال بالخادم",
          }));
        } finally {
          if (inFlight.current.get(targetKey)?.controller === controller)
            inFlight.current.delete(targetKey);
        }
      })();
      inFlight.current.set(targetKey, { controller, promise });
      return promise;
    },
    [router, initialUser.id, initialUser.role],
  );
  const refresh = useCallback(() => {
    generation.current++;
    for (const pending of inFlight.current.values()) pending.controller.abort();
    inFlight.current.clear();
    const current = cache.current[currentKey.current];
    cache.current = current ? { [currentKey.current]: current } : {};
    setSnapshots(cache.current);
    setFailures({});
    return load(currentScope.current, true);
  }, [load]);
  useEffect(() => {
    const task = setTimeout(() => void load(pageScope(pathname)), 0);
    return () => clearTimeout(task);
  }, [pathname, load]);
  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState === "visible")
        void load(currentScope.current);
    };
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => {
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, [load]);
  useEffect(
    () => () => {
      generation.current++;
      for (const pending of inFlight.current.values())
        pending.controller.abort();
      inFlight.current.clear();
    },
    [],
  );
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
  const data = snapshots[key]?.data ?? emptyPlatformData(initialUser);
  const error = failures[key] ?? null;
  const loading = !snapshots[key];
  return (
    <PlatformContext
      value={{
        data,
        loading,
        error: loading ? error : null,
        refresh,
        command,
        notify: setNotice,
      }}
    >
      {error && !loading && (
        <div className="fixed inset-x-4 top-4 z-40">
          <ErrorNotice error={error} />
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="fixed bottom-5 inset-x-4 z-40 mx-auto flex w-fit max-w-[calc(100%-32px)] items-center gap-3 border border-border bg-card px-5 py-3 shadow-md"
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
