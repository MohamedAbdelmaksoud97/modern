"use client";
import { usePreferences } from "@/components/platform/preferences";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpLeft,
  Building2,
  Compass,
  DraftingCompass,
  MapPin,
  MessageCircle,
  Mail,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LandingHeader } from "@/components/landing/header";
import { InquiryForm } from "@/components/landing/inquiry-form";
import { PublishedPortfolio } from "@/components/landing/published-portfolio";
import { InstagramIcon } from "@/components/icons/instagram";
function FloorPlan() {
  return (
    <svg
      viewBox="0 0 500 340"
      fill="none"
      aria-hidden="true"
      className="w-full text-link"
    >
      <g stroke="currentColor" strokeWidth="1" opacity="0.25">
        <path d="M25 38H475M25 302H475M55 15V325M445 15V325M45 33L65 43M435 33L455 43M45 297L65 307M435 297L455 307" />
      </g>
      <g stroke="currentColor" strokeWidth="3">
        <path d="M83 74H415V266H83V74ZM83 161H198M198 74V161M198 204V266M282 74V177H415M282 219V266M83 209H143" />
        <path d="M198 204H240M282 219H325" strokeWidth="1" />
        <path
          d="M198 161A43 43 0 0 1 241 204M282 177A42 42 0 0 1 324 219M143 209A57 57 0 0 0 200 266"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      </g>
      <g stroke="currentColor" strokeWidth="1.2" opacity="0.65">
        <path d="M99 89H182V125H99V89ZM110 89V125M171 89V125M99 133H182M304 91H393V149H304V91ZM309 98H388V139H309V98M320 144V149M377 144V149M102 177H160V194H102V177ZM111 231H140V250H111V231M336 231H388V248H336V231M353 219V258M371 219V258" />
        <circle cx="240" cy="120" r="17" />
        <path d="M240 95V145M215 120H265M455 227V267M447 239L455 227L463 239" />
      </g>
      <path
        d="M105 74H165M317 74H385M111 266H162M330 266H389"
        stroke="var(--background)"
        strokeWidth="5"
      />
      <path
        d="M105 74H165M317 74H385M111 266H162M330 266H389"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
export default function Home() {
  const { t } = usePreferences();
  const services = [
    {
      number: "01",
      icon: DraftingCompass,
      title: t(
        "تصميم الواجهات والتصميم المعماري",
        "Facade & architectural design",
      ),
      text: t(
        "ابتكار واجهات معمارية متوازنة بمختلف الأنماط (الحديث، النيو كلاسيك، الكلاسيكي، والإسلامي) وإعداد المخططات المعمارية المدروسة لتحقيق أفضل استغلال للمساحات.",
        "Balanced facades in modern, neo-classical, classical and Islamic styles, with thoughtful architectural plans that make the most of every space.",
      ),
      details: t(
        "تصميم الواجهات · المخططات المعمارية",
        "Facade design · Architectural plans",
      ),
    },
    {
      number: "02",
      icon: Building2,
      title: t(
        "التصميم الإنشائي والأنظمة (MEP)",
        "Structural design & MEP systems",
      ),
      text: t(
        "إعداد المخططات الإنشائية ومخططات الكهرباء والتكييف والصرف الصحي وفق أعلى معايير السلامة وكود البناء الكويتي.",
        "Structural, electrical, air-conditioning and drainage plans prepared to high safety standards and Kuwait building codes.",
      ),
      details: t(
        "إنشائي · كهرباء · تكييف · صرف صحي",
        "Structure · Electrical · HVAC · Drainage",
      ),
    },
    {
      number: "03",
      icon: Ruler,
      title: t(
        "التراخيص واعتماد الجهات الحكومية",
        "Permits & government approvals",
      ),
      text: t(
        "إنجاز ومتابعة كافة معاملات التراخيص الهندسية واعتماد المخططات لدى بلدية الكويت، قوة الإطفاء العام، ووزارات الخدمات.",
        "Engineering permit applications and plan approvals with Kuwait Municipality, Kuwait Fire Force and service ministries.",
      ),
      details: t(
        "بلدية الكويت · الإطفاء · وزارات الخدمات",
        "Municipality · Fire Force · Service ministries",
      ),
    },
    {
      number: "04",
      icon: ShieldCheck,
      title: t(
        "الاستشارات الهندسية والإشراف على التنفيذ",
        "Engineering consultancy & site supervision",
      ),
      text: t(
        "تقديم الاستشارات الفنية، إعداد جداول الكميات والمواصفات (BOQ)، والإشراف الهندسي الدوري لضمان مطابقة التنفيذ للمخططات المعتمدة.",
        "Technical advice, bills of quantities and specifications (BOQ), and regular engineering supervision to ensure construction follows approved plans.",
      ),
      details: t(
        "استشارات فنية · جداول كميات · إشراف هندسي",
        "Technical advice · BOQ · Site supervision",
      ),
    },
  ];
  const steps = [
    {
      title: t("نستمع لرؤيتك", "We listen to your vision"),
      text: t(
        "نتعرّف على احتياجك وطبيعة المشروع وأولوياتك، لنضع نقطة بداية واضحة.",
        "We understand your needs, project and priorities to establish a clear starting point.",
      ),
    },
    {
      title: t("نصمم التفاصيل", "We design the details"),
      text: t(
        "نطوّر المخططات والحلول الهندسية، ونتابع معك الملاحظات والاعتمادات.",
        "We develop the plans and engineering solutions, reviewing feedback and approvals with you.",
      ),
    },
    {
      title: t("نجهّز للاعتماد", "We prepare for approval"),
      text: t(
        "نستكمل الرسومات وملف البلدية، ونتابع خطوات المشروع ومتطلباته.",
        "We complete the drawings and municipality submission, following each requirement and next step.",
      ),
    },
    {
      title: t("نرافق التنفيذ", "We support construction"),
      text: t(
        "تستمر الرحلة بالإشراف الميداني والتقارير، حتى اكتمال نطاق العمل المتفق عليه.",
        "The journey continues through site supervision and reporting until the agreed scope is complete.",
      ),
    },
  ];
  return (
    <div className="overflow-x-clip bg-background text-foreground">
      <a
        href="#main"
        className="sr-only fixed start-4 top-4 z-50 rounded-sm bg-primary px-6 py-3 text-primary-foreground focus:not-sr-only"
      >
        {t("انتقل إلى المحتوى", "Skip to content")}
      </a>
      <div className="bg-inverse text-inverse-foreground">
        <div className="mx-auto flex max-w-[1420px] items-center justify-between gap-4 px-4 py-2.5 text-xs md:px-6 lg:px-10">
          <p>
            {t(
              "رؤية هندسية. تفاصيل مدروسة. مساحات للحياة.",
              "Engineering vision. Considered details. Spaces for life.",
            )}
          </p>
          <a
            href="https://wa.me/96551764654"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 underline-offset-4 hover:underline sm:flex"
          >
            <span dir="ltr">+965 5176 4654</span>
            <ArrowUpLeft className="size-3" aria-hidden="true" />
          </a>
        </div>
      </div>
      <LandingHeader />
      <main id="main">
        <section
          aria-labelledby="hero-title"
          className="mx-auto grid max-w-[1420px] gap-8 px-4 pb-10 pt-8 md:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12 lg:px-10 lg:pb-16 lg:pt-10"
        >
          <div className="flex flex-col justify-center gap-6 py-4 lg:py-6">
            <p className="flex items-center gap-3 text-xs font-medium text-link">
              <span className="h-px w-10 bg-link" />
              {t(
                "مكتب مودرن للاستشارات الهندسية",
                "Modern Engineering Consultancy",
              )}
            </p>
            <h1
              id="hero-title"
              className="max-w-lg text-[30px] font-normal leading-[1.45] md:text-[40px]"
            >
              {t(
                "مكتب مودرن للاستشارات الهندسية",
                "Modern Engineering Consultancy",
              )}
            </h1>
            <p className="max-w-md text-base leading-8 text-muted-foreground md:text-lg md:leading-8">
              {t(
                "نصمم رؤيتك بدقة هندسية.. من الفكرة المعمارية واعتماد التراخيص الحكومية وحتى الإشراف الهندسي المتكامل في الكويت.",
                "We design your vision with engineering precision, from architectural concepts and government permits to comprehensive engineering supervision in Kuwait.",
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                nativeButton={false}
                className="h-auto min-h-14 whitespace-normal py-3"
                size="lg"
                render={
                  <a
                    href="https://wa.me/96551764654"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                {t("تواصل معنا عبر واتساب", "Contact us on WhatsApp")}
                <ArrowUpLeft data-icon="inline-end" aria-hidden="true" />
              </Button>
              <Button
                nativeButton={false}
                variant="ghost"
                className="h-auto min-h-14 whitespace-normal py-3"
                size="lg"
                render={<a href="#work" />}
              >
                {t(
                  "استعرض دليل الواجهات وأعمالنا",
                  "Explore our facades & projects",
                )}
                <ArrowDownLeft data-icon="inline-end" aria-hidden="true" />
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-5 border-t border-border pt-6">
              <Compass
                className="size-8 shrink-0 text-link"
                strokeWidth={1}
                aria-hidden="true"
              />
              <p className="text-sm leading-7 text-muted-foreground">
                {t(
                  "فكرة واضحة، رحلة مترابطة.",
                  "A clear vision. A connected journey.",
                )}
                <br />
                <span className="text-foreground">
                  {t(
                    "التصميم · الاعتماد · الإشراف",
                    "Design · Approval · Supervision",
                  )}
                </span>
              </p>
            </div>
          </div>
          <figure className="relative flex min-w-0 flex-col">
            <div className="relative aspect-[5/4] overflow-hidden bg-muted lg:aspect-auto lg:min-h-[560px] lg:flex-1">
              <Image
                src="/portfolio/facade-01.jpg"
                alt={t(
                  "واجهة مقام، تصميم حديث من أعمال مكتب مودرن",
                  "Maqam facade, a modern design by Modern Engineering Consultancy",
                )}
                fill
                sizes="(min-width: 1024px) 56vw, 100vw"
                preload
                className="object-cover object-[53%_center]"
              />
              <div className="absolute end-5 top-5 flex size-20 items-center justify-center border border-background/65 bg-inverse/75 text-center text-xs leading-5 text-inverse-foreground backdrop-blur-sm">
                {t("صُممت", "DESIGNED")}
                <br />
                {t("للحياة", "FOR LIVING")}
              </div>
            </div>
            <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3 text-xs text-muted-foreground">
              <span>{t("ضوء، توازن، وحياة.", "Light, balance and life.")}</span>
              <a href="#work" className="underline underline-offset-4">
                {t(
                  "واجهة مقام / من أعمال مودرن",
                  "Maqam facade / Modern portfolio",
                )}
              </a>
            </figcaption>
          </figure>
        </section>
        <section
          id="about"
          aria-labelledby="about-title"
          className="border-y border-border bg-secondary/35"
        >
          <div className="mx-auto grid max-w-[1420px] items-center gap-10 px-4 py-14 md:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20 lg:px-10 lg:py-20">
            <div className="flex flex-col gap-5">
              <p className="text-xs font-medium text-link">
                {t("01 / عن مودرن", "01 / About Modern")}
              </p>
              <h2
                id="about-title"
                className="text-2xl font-medium leading-[1.65]"
              >
                {t("هندسة تفهم احتياجك،", "Engineering that understands you.")}
                <br />
                {t("وعمارة تعبّر عنك.", "Architecture that reflects you.")}
              </h2>
              <p className="max-w-md text-base leading-8 text-muted-foreground">
                {t(
                  "مكتب مودرن للاستشارات الهندسية هو دار استشارية هندسية متخصصة في تقديم حلول التصميم المعماري والإنشائي المتكاملة، نجمع بين الخبرة الهندسية والرؤية العصرية لإنتاج مشاريع تعكس أعلى معايير الجودة والتميز. نؤمن أن كل مشروع هو فرصة لابتكار تجربة فريدة، لذا نحرص على دراسة التفاصيل بعناية لتحقيق التوازن الدقيق بين الجمال المعماري والكفاءة الوظيفية بما يلبي تطلعات عملائنا.",
                  "Modern Engineering Consultancy specializes in integrated architectural and structural design. We combine engineering expertise with a contemporary vision to create projects of the highest quality. Every project is an opportunity to create a unique experience, balancing architectural beauty and functional efficiency through careful attention to detail and our clients’ aspirations.",
                )}
              </p>
              <a
                href="#process"
                className="inline-flex min-h-12 w-fit items-center gap-5 text-sm font-medium text-link underline underline-offset-8"
              >
                {t("تعرّف على رحلة مشروعك", "Discover your project journey")}
                <ArrowLeft className="size-4" aria-hidden="true" />
              </a>
            </div>
            <div className="relative border border-border bg-background p-5 md:p-10">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {t("الفكرة في كل تفصيل", "An idea in every detail")}
                </span>
                <span>
                  {t("مودرن / دراسة تصميمية", "MODERN / DESIGN STUDY")}
                </span>
              </div>
              <FloorPlan />
              <p className="border-t border-border pt-4 text-xs text-muted-foreground">
                {t(
                  "رسم توضيحي لدراسة توزيع المساحات",
                  "Illustrative spatial planning study",
                )}
              </p>
            </div>
          </div>
        </section>
        <section
          id="services"
          aria-labelledby="services-title"
          className="mx-auto max-w-[1420px] px-4 py-14 md:px-6 lg:px-10 lg:py-20"
        >
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="flex flex-col gap-4">
              <p className="text-xs font-medium text-link">
                {t("02 / خبراتنا", "02 / Our expertise")}
              </p>
              <h2
                id="services-title"
                className="text-2xl font-medium leading-relaxed"
              >
                {t("حلول متكاملة.", "Integrated solutions.")}
                <br />
                {t("من الفكرة إلى المبنى.", "From the idea to the building.")}
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-muted-foreground">
              {t(
                "نطاق خدمات يرافق احتياجات مشروعك في مراحل التصميم والإجراءات والإشراف.",
                "Services that support your project through design, submissions and site supervision.",
              )}
            </p>
          </div>
          <div className="grid border-s border-t border-border md:grid-cols-2 xl:grid-cols-4">
            {services.map((service) => (
              <article
                key={service.number}
                className="flex flex-col gap-6 border-b border-e border-border p-6 transition-colors duration-200 hover:bg-accent/40 lg:p-7"
              >
                <div className="flex items-center justify-between">
                  <service.icon
                    className="size-9 text-link"
                    strokeWidth={1}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-muted-foreground" dir="ltr">
                    /{service.number}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-medium">{service.title}</h3>
                <p className="flex-1 text-sm leading-7 text-muted-foreground">
                  {service.text}
                </p>
                <p className="border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
                  {service.details}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {t(
                "لديك احتياج مختلف؟ نبدأ بفهم مشروعك.",
                "Something different in mind? We begin by understanding your project.",
              )}
            </p>
            <a
              href="#contact"
              className="inline-flex min-h-12 items-center gap-3 text-sm font-medium text-link underline-offset-4 hover:underline"
            >
              {t("اطلب استشارة", "Request a consultation")}
              <ArrowUpLeft className="size-4" aria-hidden="true" />
            </a>
          </div>
        </section>
        <PublishedPortfolio />
        <section
          id="process"
          aria-labelledby="process-title"
          className="mx-auto max-w-[1420px] px-4 py-14 md:px-6 lg:px-10 lg:py-20"
        >
          <div className="mb-10 flex flex-col gap-4">
            <p className="text-xs font-medium text-link">
              {t("04 / آلية العمل", "04 / How we work")}
            </p>
            <h2
              id="process-title"
              className="text-2xl font-medium leading-relaxed"
            >
              {t("خطوات واضحة.", "Clear steps.")}
              <br />
              {t("وشراكة في كل مرحلة.", "A partnership at every stage.")}
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="flex flex-col gap-4 border-t border-border pt-5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-3xl font-normal text-link" dir="ltr">
                    0{index + 1}
                  </span>
                  <ArrowLeft
                    className="size-5 text-muted-foreground"
                    strokeWidth={1}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-lg font-medium">{step.title}</h3>
                <p className="max-w-xs text-sm leading-7 text-muted-foreground">
                  {step.text}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-12 flex flex-col justify-between gap-5 border border-border bg-secondary/40 p-6 sm:flex-row sm:items-center md:p-8">
            <div className="flex flex-col gap-2">
              <p className="font-medium">
                {t("مشروعك معك، أينما كنت.", "Your project, wherever you are.")}
              </p>
              <p className="text-sm leading-7 text-muted-foreground">
                {t(
                  "بوابة خاصة لمتابعة حالة مشروعك والملفات والمستجدات المتاحة لك.",
                  "A private portal to follow your project status, shared documents and updates.",
                )}
              </p>
            </div>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/login" />}
            >
              {t("دخول بوابة العملاء", "Client portal")}
              <ArrowUpLeft data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </section>
        <section
          id="contact"
          aria-labelledby="contact-title"
          className="border-t border-border bg-secondary/40"
        >
          <div className="mx-auto grid max-w-[1420px] gap-10 px-4 py-14 md:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-10 lg:py-20">
            <div className="flex flex-col items-start gap-6">
              <p className="text-xs font-medium text-link">
                {t("05 / لنبدأ معًا", "05 / Let’s begin")}
              </p>
              <h2
                id="contact-title"
                className="text-[30px] font-normal leading-[1.6] md:text-[40px]"
              >
                {t("لمشروعك القادم،", "Your next project")}
                <br />
                {t("بداية تستحقها.", "deserves a considered start.")}
              </h2>
              <p className="max-w-sm text-base leading-8 text-muted-foreground">
                {t(
                  "أخبرنا بما تفكر به. شاركنا تفاصيل مشروعك، وسنتواصل معك لمناقشة الخطوة التالية.",
                  "Tell us what you have in mind. Share your project details and we will get in touch to discuss the next step.",
                )}
              </p>
              <a
                href="https://wa.me/96551764654"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center gap-3 text-link underline underline-offset-8"
              >
                <span>
                  {t("أو تواصل مباشرة عبر واتساب", "Or contact us on WhatsApp")}
                </span>
                <ArrowUpLeft className="size-4" aria-hidden="true" />
              </a>
              <p className="max-w-sm text-sm leading-7 text-muted-foreground">
                {t(
                  "شرق – شارع أحمد الجابر – قطعة 2 – قسيمة بيت التمويل – الدور 26، الكويت",
                  "Sharq, Ahmad Al Jaber Street, Block 2, Kuwait Finance House plot, Floor 26, Kuwait",
                )}
              </p>
              <a
                href="mailto:MODERNCONKW@GMAIL.COM"
                className="inline-flex min-h-12 max-w-full items-center gap-2 text-sm text-link underline underline-offset-4"
              >
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                <bdi className="break-all">MODERNCONKW@GMAIL.COM</bdi>
              </a>
              <a href="tel:+96551764655" className="text-xl" dir="ltr">
                +965 5176 4655
              </a>
              <a
                href="tel:+96551764654"
                className="text-xl font-normal"
                dir="ltr"
              >
                +965 5176 4654
              </a>
              <a
                href="https://www.google.com/maps/search/?api=1&query=شرق+شارع+أحمد+الجابر+بيت+التمويل+الكويت"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                <MapPin className="size-4" aria-hidden="true" />
                {t("موقع المكتب على الخريطة", "Find the office on the map")}
                <ArrowUpLeft className="size-3" aria-hidden="true" />
              </a>
            </div>
            <div className="flex min-w-0 flex-col gap-8">
              <InquiryForm />
              <iframe
                title={t(
                  "موقع مكتب مودرن في شرق، الكويت",
                  "Modern office location in Sharq, Kuwait",
                )}
                src="https://maps.google.com/maps?q=شرق+شارع+أحمد+الجابر+بيت+التمويل+الكويت&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-72 w-full border border-border"
              />
            </div>
          </div>
        </section>
      </main>
      <a
        href="https://wa.me/96551764654"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t(
          "تواصل مع مودرن عبر واتساب",
          "Contact Modern on WhatsApp",
        )}
        className="no-print fixed right-5 bottom-5 z-40 flex size-14 items-center justify-center rounded-full border border-input bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary-hover"
      >
        <MessageCircle className="size-6" aria-hidden="true" />
      </a>
      <footer className="bg-inverse text-inverse-foreground dark:bg-card dark:text-card-foreground">
        <div className="mx-auto max-w-[1420px] px-4 pb-24 pt-12 md:px-6 lg:px-10">
          <div className="grid gap-9 pb-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="flex flex-col gap-5">
              <a href="#" className="flex w-fit items-center gap-4">
                <Image
                  src="/logo.png"
                  alt={t("شعار مكتب مودرن", "Modern Office logo")}
                  width={46}
                  height={57}
                  className="h-14 w-auto"
                />
                <div>
                  <p className="text-xl font-medium">{t("مودرن", "Modern")}</p>
                  <p className="mt-1 text-xs opacity-75">
                    {t("للاستشارات الهندسية", "Engineering Consultancy")}
                  </p>
                </div>
              </a>
              <p className="max-w-xs text-sm leading-7 opacity-75">
                {t(
                  "نحو مساحات أجمل، وحلول هندسية أكثر وضوحًا.",
                  "Creating better spaces with clearer engineering solutions.",
                )}
              </p>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <p className="mb-2 text-xs text-primary">
                {t("اكتشف مودرن", "Explore Modern")}
              </p>
              <a
                href="#about"
                className="w-fit underline-offset-4 hover:underline"
              >
                {t("عن المكتب", "About the office")}
              </a>
              <a
                href="#services"
                className="w-fit underline-offset-4 hover:underline"
              >
                {t("خدماتنا", "Our services")}
              </a>
              <a
                href="#work"
                className="w-fit underline-offset-4 hover:underline"
              >
                {t("أعمالنا", "Our work")}
              </a>
              <Link
                href="/login"
                className="w-fit underline-offset-4 hover:underline"
              >
                {t("بوابة العملاء وفريق العمل", "Client & team portal")}
              </Link>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <p className="mb-2 text-xs text-primary">
                {t("نبقى على تواصل", "Stay connected")}
              </p>
              <a
                href="https://www.instagram.com/modernofficekw/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 w-fit max-w-full items-center gap-3 underline-offset-4 hover:underline"
              >
                <InstagramIcon className="size-6 shrink-0" aria-hidden="true" />
                <span className="flex min-w-0 flex-col gap-1">
                  <span>{t("إنستجرام", "Instagram")}</span>
                  <bdi className="text-xs">@MODERNOFFICEKW</bdi>
                </span>
                <ArrowUpLeft className="size-3" aria-hidden="true" />
              </a>
              <a
                href="mailto:MODERNCONKW@GMAIL.COM"
                className="inline-flex min-h-12 w-fit max-w-full items-center gap-2 underline-offset-4 hover:underline"
              >
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                <bdi className="break-all">MODERNCONKW@GMAIL.COM</bdi>
              </a>
              <a
                href="https://wa.me/96551764654"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-2 underline-offset-4 hover:underline"
              >
                WhatsApp
                <ArrowUpLeft className="size-3" aria-hidden="true" />
              </a>
            </div>
          </div>
          <Separator className="bg-current opacity-20" />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 text-xs opacity-70">
            <p>
              © {2026}{" "}
              {t(
                "مكتب مودرن للاستشارات الهندسية. جميع الحقوق محفوظة.",
                "Modern Engineering Consultancy. All rights reserved.",
              )}
            </p>
            <p className="tracking-[0.05em]">
              {t("مساحة. غاية. مودرن.", "SPACE. PURPOSE. MODERN.")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
