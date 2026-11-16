"use client";
import { usePreferences } from "@/components/platform/preferences";
import { type FormEvent, useRef, useState } from "react";
import {
  ArrowUpLeft,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
type Errors = Partial<
  Record<"name" | "phone" | "service" | "message", boolean>
>;
export function InquiryForm() {
  const { t } = usePreferences();
  const services = [
    t("تصميم الواجهات والتصميم المعماري", "Facade & architectural design"),
    t("التصميم الإنشائي والأنظمة (MEP)", "Structural design & MEP systems"),
    t("التراخيص واعتماد الجهات الحكومية", "Permits & government approvals"),
    t(
      "الاستشارات الهندسية والإشراف على التنفيذ",
      "Engineering consultancy & site supervision",
    ),
    t("استشارة أخرى", "Other consultation"),
  ];
  const validationMessages = {
    name: t(
      "يرجى كتابة اسم بين حرفين و120 حرفًا.",
      "Please enter a name between 2 and 120 characters.",
    ),
    phone: t(
      "يرجى كتابة رقم هاتف صحيح مع رمز الدولة.",
      "Please enter a valid phone number with country code.",
    ),
    service: t("يرجى اختيار الخدمة المطلوبة.", "Please choose a service."),
    message: t(
      "يرجى كتابة نبذة عن المشروع بين 5 و3000 حرف.",
      "Please describe your project in 5 to 3,000 characters.",
    ),
  };
  const formRef = useRef<HTMLFormElement>(null);
  const [service, setService] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<
    "" | "rate" | "server" | "network"
  >("");
  const requestErrors = {
    rate: t(
      "وصلتنا عدة طلبات خلال وقت قصير. يرجى الانتظار قليلًا ثم المحاولة مجددًا.",
      "We have received several requests in a short time. Please wait a moment and try again.",
    ),
    server: t(
      "تعذر إرسال الطلب الآن. حاول مرة أخرى أو تواصل معنا عبر واتساب.",
      "We could not send your request. Please try again or contact us on WhatsApp.",
    ),
    network: t(
      "تعذر الاتصال. تحقق من اتصال الإنترنت ثم حاول مرة أخرى، أو تواصل معنا عبر واتساب.",
      "Could not connect. Please check your connection and try again, or contact us on WhatsApp.",
    ),
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "pending") return;
    const data = new FormData(event.currentTarget);
    const values = {
      name: String(data.get("name") || "").trim(),
      phone: String(data.get("phone") || "")
        .trim()
        .replace(/[٠-٩]/g, (value) => String(value.charCodeAt(0) - 1632))
        .replace(/[۰-۹]/g, (value) => String(value.charCodeAt(0) - 1776)),
      service: service !== null ? services[Number(service)] || "" : "",
      message: String(data.get("message") || "").trim(),
      website: String(data.get("website") || ""),
    };
    const nextErrors: Errors = {};
    if (values.name.length < 2 || values.name.length > 120)
      nextErrors.name = true;
    const digits = values.phone.replace(/\D/g, "");
    if (
      !/^[+\d\s()\-]+$/.test(values.phone) ||
      digits.length < 8 ||
      digits.length > 16
    )
      nextErrors.phone = true;
    if (!values.service) nextErrors.service = true;
    if (values.message.length < 5 || values.message.length > 3000)
      nextErrors.message = true;
    setErrors(nextErrors);
    setStatus("idle");
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0];
      window.requestAnimationFrame(() =>
        document.getElementById(`inquiry-${first}`)?.focus(),
      );
      return;
    }
    setStatus("pending");
    setErrorMessage("");
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok === false) {
        setErrorMessage(response.status === 429 ? "rate" : "server");
        setStatus("error");
        return;
      }
      setStatus("success");
      formRef.current?.reset();
      setService(null);
    } catch {
      setErrorMessage("network");
      setStatus("error");
    }
  }
  return (
    <div className="border border-border bg-card p-6 md:p-8">
      {status === "success" ? (
        <div className="flex min-h-[440px] flex-col items-start justify-center gap-6">
          <Alert className="text-start">
            <CheckCircle2 aria-hidden="true" />
            <AlertTitle>
              {t("وصلنا طلبك بنجاح", "Your request has been received")}
            </AlertTitle>
            <AlertDescription>
              {t(
                "شكرًا لتواصلك مع مكتب مودرن. سيتواصل معك فريقنا على رقم الهاتف الذي أرسلته لمناقشة مشروعك.",
                "Thank you for contacting Modern Office. Our team will contact you at the phone number you provided to discuss your project.",
              )}
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => setStatus("idle")}>
            {t("إرسال طلب آخر", "Send another request")}
            <ArrowUpLeft data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <form
          ref={formRef}
          onSubmit={submit}
          noValidate
          aria-label={t(
            "طلب استشارة هندسية",
            "Engineering consultation request",
          )}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-medium">
              {t("حدثنا عن مشروعك", "Tell us about your project")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("جميع الحقول مطلوبة.", "All fields are required.")}
            </p>
          </div>
          <FieldGroup>
            <FieldGroup className="sm:flex-row">
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="inquiry-name">
                  {t("الاسم", "Name")}
                </FieldLabel>
                <Input
                  id="inquiry-name"
                  name="name"
                  autoComplete="name"
                  placeholder={t("اسمك الكامل", "Your full name")}
                  required
                  maxLength={120}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={
                    errors.name ? "inquiry-name-error" : undefined
                  }
                  disabled={status === "pending"}
                />
                {errors.name && (
                  <FieldError id="inquiry-name-error">
                    {validationMessages.name}
                  </FieldError>
                )}
              </Field>
              <Field data-invalid={Boolean(errors.phone)}>
                <FieldLabel htmlFor="inquiry-phone">
                  {t("رقم الهاتف", "Phone number")}
                </FieldLabel>
                <Input
                  id="inquiry-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="+965 0000 0000"
                  required
                  maxLength={30}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={
                    errors.phone ? "inquiry-phone-error" : undefined
                  }
                  disabled={status === "pending"}
                />
                {errors.phone && (
                  <FieldError id="inquiry-phone-error">
                    {validationMessages.phone}
                  </FieldError>
                )}
              </Field>
            </FieldGroup>
            <Field data-invalid={Boolean(errors.service)}>
              <FieldLabel htmlFor="inquiry-service">
                {t("الخدمة المطلوبة", "Service")}
              </FieldLabel>
              <Select
                items={services.map((label, index) => ({
                  value: String(index),
                  label,
                }))}
                value={service}
                onValueChange={setService}
                disabled={status === "pending"}
              >
                <SelectTrigger
                  id="inquiry-service"
                  className="w-full"
                  aria-invalid={Boolean(errors.service)}
                  aria-describedby={
                    errors.service ? "inquiry-service-error" : undefined
                  }
                >
                  <SelectValue
                    placeholder={t("اختر الخدمة المناسبة", "Choose a service")}
                    className="text-start"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {services.map((item, index) => (
                      <SelectItem key={index} value={String(index)}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.service && (
                <FieldError id="inquiry-service-error">
                  {validationMessages.service}
                </FieldError>
              )}
            </Field>
            <Field data-invalid={Boolean(errors.message)}>
              <FieldLabel htmlFor="inquiry-message">
                {t("نبذة عن المشروع", "Project details")}
              </FieldLabel>
              <Textarea
                id="inquiry-message"
                name="message"
                rows={4}
                maxLength={3000}
                required
                placeholder={t(
                  "نوع المشروع، الموقع، وما الذي تتطلع إليه…",
                  "Project type, location and what you have in mind…",
                )}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={
                  errors.message ? "inquiry-message-error" : undefined
                }
                disabled={status === "pending"}
              />
              {errors.message && (
                <FieldError id="inquiry-message-error">
                  {validationMessages.message}
                </FieldError>
              )}
            </Field>
            <div hidden aria-hidden="true">
              <label htmlFor="inquiry-website">Website</label>
              <input
                id="inquiry-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
          </FieldGroup>
          {status === "error" && (
            <Alert variant="destructive" className="text-start">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>
                {t("لم يكتمل إرسال الطلب", "Your request was not sent")}
              </AlertTitle>
              <AlertDescription>
                {errorMessage && requestErrors[errorMessage]}
              </AlertDescription>
            </Alert>
          )}
          <Button type="submit" size="lg" disabled={status === "pending"}>
            {status === "pending" ? (
              <>
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                  aria-hidden="true"
                />
                {t("جارٍ إرسال الطلب…", "Sending your request…")}
              </>
            ) : (
              <>
                {t("إرسال طلب الاستشارة", "Send consultation request")}
                <ArrowUpLeft data-icon="inline-end" aria-hidden="true" />
              </>
            )}
          </Button>
          <FieldDescription className="text-start">
            {t(
              "تُستخدم بياناتك للتواصل معك بشأن طلبك.",
              "Your details are used to contact you about your request.",
            )}
          </FieldDescription>
        </form>
      )}
    </div>
  );
}
