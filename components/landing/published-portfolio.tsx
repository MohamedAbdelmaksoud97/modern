"use client";
import { useEffect, useState } from "react";
import { usePreferences } from "@/components/platform/preferences";
import Image from "next/image";
import { ArrowUpLeft, Building2, CircleAlert, MapPin } from "lucide-react";
import type { Portfolio } from "@/lib/types";
import referencePortfolio from "@/lib/landing-portfolio.json";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function PublishedPortfolio() {
  const { t } = usePreferences();
  const [items, setItems] = useState<Portfolio[]>([]);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [style, setStyle] = useState("all");
  const categories = [
    { value: "all", label: t("جميع الأعمال", "All projects") },
    { value: "modern", label: t("حديث", "Modern") },
    { value: "neo-classic", label: t("نيو كلاسيك", "Neo classic") },
    { value: "classic", label: t("كلاسيكي وإسلامي", "Classic & Islamic") },
  ];
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setError(false);
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
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);
  function categoryStyle(category: string) {
    if (/neo|نيو|حديث كلاسيكي/i.test(category)) return "neo-classic";
    if (/classic|islamic|كلاسيك|إسلامي/i.test(category)) return "classic";
    if (/modern|حديث/i.test(category)) return "modern";
    return "other";
  }
  const projects = [
    ...referencePortfolio.map((item) => ({
      ...item,
      title: t(item.title, item.title_en),
      location: "",
      description: t(item.description, item.description_en),
      category: categories.find((category) => category.value === item.style)!
        .label,
    })),
    ...items.map((item) => ({ ...item, style: categoryStyle(item.category) })),
  ];
  const visible = projects.filter(
    (item) => style === "all" || item.style === style,
  );
  return (
    <section
      id="work"
      aria-labelledby="work-title"
      className="border-y border-border bg-secondary/35"
    >
      <div className="mx-auto max-w-[1420px] px-4 py-14 md:px-6 lg:px-10 lg:py-20">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium text-link">
              {t("03 / أعمالنا", "03 / Our work")}
            </p>
            <h2
              id="work-title"
              className="text-2xl font-medium leading-relaxed"
            >
              {t(
                "دليل الواجهات وأعمالنا المختارة",
                "Selected projects & facade designs",
              )}
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-muted-foreground">
            {t(
              "نماذج من تصاميم المكتب، تجمع بين الطراز الحديث والنيو كلاسيك والكلاسيكي والإسلامي.",
              "Office designs spanning modern, neo-classical, classical and Islamic architecture.",
            )}
          </p>
        </div>
        <Tabs value={style} onValueChange={(value) => setStyle(String(value))}>
          <TabsList
            aria-label={t(
              "تصفية الأعمال حسب النمط",
              "Filter projects by style",
            )}
            className="mb-6 w-full"
          >
            {categories.map((category) => (
              <TabsTrigger key={category.value} value={category.value}>
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={style}>
            <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((item) => (
                <article key={item.id} className="flex min-w-0 flex-col gap-4">
                  <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        unoptimized={!item.image_url.startsWith("/portfolio/")}
                        className="object-contain"
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
                  <p className="text-xs text-link">{item.category}</p>
                  {item.location && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" aria-hidden="true" />
                      {item.location}
                    </p>
                  )}
                  <h3 className="text-lg font-medium">{item.title}</h3>
                  <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        {error && (
          <Alert className="mt-8 text-start">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>
              {t(
                "تعذر تحميل الأعمال الإضافية",
                "Additional projects could not be loaded",
              )}
            </AlertTitle>
            <AlertDescription>
              {t(
                "يمكنك تصفح دليل الواجهات أعلاه أو إعادة المحاولة لتحميل أحدث الأعمال.",
                "Browse the facade collection above or try again to load the latest projects.",
              )}
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => setAttempt((value) => value + 1)}
              >
                {t("إعادة المحاولة", "Try again")}
                <ArrowUpLeft data-icon="inline-end" aria-hidden="true" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </section>
  );
}
