"use client";
import type { ReactNode } from "react";
import type { User } from "@/lib/types";
import { PlatformProvider, usePlatform } from "./provider";
import { Shell } from "./shell";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import { ErrorNotice } from "./forms";
import { usePreferences } from "./preferences";

function PageContent({ children }: { children: ReactNode }) {
  const { loading, error, refresh } = usePlatform();
  const { t } = usePreferences();
  if (error)
    return (
      <section className="app-panel flex flex-col items-start gap-4">
        <ErrorNotice error={error} />
        <Button variant="outline" onClick={() => void refresh()}>
          {t("إعادة المحاولة", "Try again")}
        </Button>
      </section>
    );
  if (loading) return <SectionLoading />;
  return children;
}

export function SectionLoading() {
  const { t } = usePreferences();
  return (
    <div
      role="status"
      className="flex min-h-56 items-center justify-center gap-3 text-muted-foreground"
    >
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      <p>{t("جارٍ تحميل القسم…", "Loading this section…")}</p>
    </div>
  );
}

export function WorkspaceFrame({
  children,
  user,
  portal = false,
}: {
  children: ReactNode;
  user: User;
  portal?: boolean;
}) {
  return (
    <PlatformProvider key={user.id + ":" + user.role} initialUser={user}>
      <Shell portal={portal}>
        <PageContent>{children}</PageContent>
      </Shell>
    </PlatformProvider>
  );
}
