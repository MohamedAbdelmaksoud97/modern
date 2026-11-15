"use client";
import { useEffect, useState } from "react";
import { usePreferences } from "@/components/platform/preferences";
import Image from "next/image";
import {
  ArrowUpLeft,
  Building2,
  CircleAlert,
  LoaderCircle,
  MapPin,
} from "lucide-react";
import type { Portfolio } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
export function PublishedPortfolio() {
  const { t } = usePreferences();
  const [items, setItems] = useState<Portfolio[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setStatus("loading");
      try {
        const response = await fetch("/api/public", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json();
        if (!Array.isArray(data.portfolio)) throw new Error("invalid response");
        setItems(
          data.portfolio.filter((item: Portfolio) => item.published !== false),
        );
        setStatus("ready");
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);
  return (
    <section
      id="work"
      aria-labelledby="work-title"
      className="border-y border-border bg-secondary/35"
    >
      <div className="mx-auto max-w-[1420px] px-4 py-14 md:px-6 lg:px-10 lg:py-20">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium text-link">
              {t("03 / أعمالنا", "03 / Our work")}
            </p>
            <h2
              id="work-title"
              className="text-2xl font-medium leading-relaxed"
            >
              {t("لكل مشروع حكاية.", "Every project has a story.")}
              <br />
              {t("ولكل تفصيل معنى.", "Every detail has a purpose.")}
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-muted-foreground">
            {t(
              "مساحة لعرض مشاريع المكتب وصورها، بعد اعتمادها للنشر.",
              "A selection of office projects and images, once approved for publication.",
            )}
          </p>
        </div>
        {status === "loading" && (
          <div
            role="status"
            className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground"
          >
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            {t("جارٍ تحميل الأعمال…", "Loading projects…")}
          </div>
        )}
        {status === "error" && (
          <Alert className="text-start">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>
              {t("تعذر عرض الأعمال الآن", "Projects are unavailable right now")}
            </AlertTitle>
            <AlertDescription>
              {t(
                "يمكنك إعادة المحاولة أو التواصل معنا للتعرف على أعمال المكتب.",
                "Please try again or contact us to learn about our work.",
              )}
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setAttempt((value) => value + 1)}
              >
                {t("إعادة المحاولة", "Try again")}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {status === "ready" && items.length === 0 && (
          <Empty className="min-h-64 border border-border bg-background">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Building2 aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                {t(
                  "أعمالنا تُضاف هنا قريبًا",
                  "Our project gallery is coming soon",
                )}
              </EmptyTitle>
              <EmptyDescription>
                {t(
                  "نعمل على تجهيز معرض مشاريع المكتب. يسعدنا الحديث معك عن مشروعك وما يناسبه من حلول.",
                  "We are preparing our project gallery. In the meantime, we would love to discuss your project and the right solutions for it.",
                )}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" render={<a href="#contact" />}>
                {t("لنتحدث عن فكرتك", "Let’s talk about your idea")}
                <ArrowUpLeft data-icon="inline-end" aria-hidden="true" />
              </Button>
            </EmptyContent>
          </Empty>
        )}
        {status === "ready" && items.length > 0 && (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="flex min-w-0 flex-col gap-4">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Building2
                        className="size-12 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-link">{item.category}</p>
                  {item.location && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" aria-hidden="true" />
                      {item.location}
                    </p>
                  )}
                </div>
                <h3 className="text-lg font-medium">{item.title}</h3>
                {item.description && (
                  <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
