"use client";
import { usePreferences } from "./preferences";
import {
  useId,
  useState,
  type FormEvent,
  type ReactNode,
  type ComponentProps,
} from "react";
import { LoaderCircle, CircleAlert, FolderOpen, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import type { CommandResult } from "@/lib/types";
import { cn } from "@/lib/utils";
export function SearchField({
  label,
  className,
  ...props
}: ComponentProps<typeof Input> & { label: string }) {
  const { t } = usePreferences();
  const generatedId = useId();
  const id = props.id || generatedId;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{t(label)}</FieldLabel>
      <div className="relative min-w-0">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input {...props} id={id} type="search" className={cn("ps-12", className)} />
      </div>
    </Field>
  );
}
export function TextField({
  label,
  hint,
  ...props
}: ComponentProps<typeof Input> & {
  label: string;
  hint?: string;
}) {
  const { t } = usePreferences();
  const generatedId = useId();
  const id = props.id || generatedId;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{t(label)}</FieldLabel>
      <Input
        {...props}
        id={id}
        aria-describedby={
          props["aria-describedby"] || (hint ? `${id}-hint` : undefined)
        }
      />
      {hint && (
        <FieldDescription id={`${id}-hint`} className="text-start">
          {t(hint)}
        </FieldDescription>
      )}
    </Field>
  );
}
export function AreaField({
  label,
  ...props
}: ComponentProps<typeof Textarea> & {
  label: string;
}) {
  const { t } = usePreferences();
  const generatedId = useId();
  const id = props.id || generatedId;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{t(label)}</FieldLabel>
      <Textarea {...props} id={id} />
    </Field>
  );
}
export type Option = {
  value: string;
  label: string;
};
export function SelectField({
  label,
  name,
  options,
  defaultValue,
  required = true,
  onChange,
}: {
  label: string;
  name: string;
  options: Option[];
  defaultValue?: string;
  required?: boolean;
  onChange?: (v: string) => void;
}) {
  const { t } = usePreferences();
  const id = useId();
  const translatedOptions = options.map((option) => ({
    ...option,
    label: t(option.label),
  }));
  return (
    <Field>
      <FieldLabel htmlFor={id}>{t(label)}</FieldLabel>
      <Select
        name={name}
        items={translatedOptions}
        defaultValue={defaultValue || null}
        required={required}
        onValueChange={(v) => onChange?.(String(v || ""))}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue
            className="text-start"
            placeholder={t("اختر من القائمة", "Select an option")}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {translatedOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
const formErrorEnglish: Record<string, string> = {
  "تعذر إتمام العملية. حاول مجددًا.":
    "Could not complete the request. Please try again.",
  "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.":
    "Too many attempts. Please wait a moment and try again.",
  "انتهت الجلسة. سجّل دخولك من جديد.":
    "Your session has expired. Please sign in again.",
  "بيانات الدخول غير صحيحة": "Your login details are incorrect.",
  "تحقق من كلمة المرور الحالية، واختر كلمة مرور جديدة مختلفة لا تقل عن 12 حرفًا.":
    "Check your current password and choose a different new password with at least 12 characters.",
  "تعذر الاتصال بالخادم. تحقق من الاتصال ثم أعد المحاولة.":
    "Could not connect to the server. Check your connection and try again.",
  "تعذر حفظ البيانات": "Could not save your changes.",
  "تعذر الاتصال. حاول مجددًا.": "Could not connect. Please try again.",
};
export function ErrorNotice({ error }: { error: string | null | undefined }) {
  const { t } = usePreferences();
  return error ? (
    <Alert variant="destructive" role="alert" className="text-start">
      <CircleAlert aria-hidden="true" />
      <AlertDescription>{t(error, formErrorEnglish[error])}</AlertDescription>
    </Alert>
  ) : null;
}
export function NoData({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  const { t } = usePreferences();
  return (
    <Empty className="min-h-56 border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>
          {title ? t(title) : t("لا توجد بيانات بعد", "No data yet")}
        </EmptyTitle>
        <EmptyDescription>
          {description
            ? t(description)
            : t(
                "ستظهر البيانات هنا فور إضافتها.",
                "Your records will appear here once added.",
              )}
        </EmptyDescription>
      </EmptyHeader>
      {children}
    </Empty>
  );
}
export function ActionForm({
  onSubmit,
  children,
  submitLabel = "حفظ",
  onSuccess,
}: {
  onSubmit: (form: FormData) => Promise<CommandResult>;
  children: ReactNode;
  submitLabel?: string;
  onSuccess?: (result: CommandResult) => void;
}) {
  const { t } = usePreferences();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    setError(null);
    setBusy(true);
    try {
      const result = await onSubmit(form);
      if (!result.ok) {
        setError(result.error || "تعذر حفظ البيانات");
        return;
      }
      onSuccess?.(result);
    } catch {
      setError("تعذر الاتصال. حاول مجددًا.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
        {children}
      </fieldset>
      <ErrorNotice error={error} />
      <Button type="submit" disabled={busy} className="self-start">
        {busy && (
          <LoaderCircle
            className="animate-spin"
            data-icon="inline-start"
            aria-hidden="true"
          />
        )}
        {busy
          ? t("جارٍ الحفظ…", "Saving…")
          : t(submitLabel, submitLabel === "حفظ" ? "Save" : undefined)}
      </Button>
    </form>
  );
}
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { t, locale } = usePreferences();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-5 sm:max-w-xl sm:p-6"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon"
              className="absolute end-3 top-3"
              aria-label={t("إغلاق النافذة", "Close dialog")}
            />
          }
        >
          <X aria-hidden="true" />
        </DialogClose>
        <DialogHeader className="pb-3 pe-12">
          <DialogTitle className="text-xl leading-normal">
            {t(title)}
          </DialogTitle>
          <DialogDescription>
            {description
              ? t(description)
              : t(
                  "أدخل البيانات المطلوبة ثم احفظ التغييرات.",
                  "Enter the required information, then save your changes.",
                )}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function formObject(form: FormData) {
  const passwordFields = new Set([
    "password",
    "current_password",
    "new_password",
  ]);
  return Object.fromEntries(
    Array.from(form.entries()).map(([key, value]) => [
      key,
      typeof value === "string" && !passwordFields.has(key)
        ? value.trim()
        : value,
    ]),
  );
}
function activeLocale(locale?: "ar" | "en") {
  if (locale) return locale;
  try {
    return typeof window !== "undefined" &&
      window.localStorage.getItem("modern_locale") === "en"
      ? "en"
      : "ar";
  } catch {
    return "ar";
  }
}
export function money(
  value: string | number | undefined,
  locale?: "ar" | "en",
) {
  if (value === undefined || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat(
    activeLocale(locale) === "en" ? "en-KW" : "ar-KW",
    {
      style: "currency",
      currency: "KWD",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    },
  ).format(Number(value));
}
export function date(value: string | null | undefined, locale?: "ar" | "en") {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat(
        activeLocale(locale) === "en" ? "en-KW" : "ar-KW",
        { dateStyle: "medium", timeZone: "Asia/Kuwait" },
      ).format(parsed);
}
