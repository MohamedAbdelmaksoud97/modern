"use client";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LedgerDocument, OfficeIdentity } from "@/lib/accounting-types";
import { usePreferences } from "./preferences";

export function officeMoney(value: string | number) {
  const decimal = typeof value === "number" ? value.toFixed(3) : value;
  const [whole, fraction = ""] = decimal.split(".");
  return (
    whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + fraction.padEnd(3, "0")
  );
}

export function BrandedSheet({
  identity,
  title,
  subtitle,
  children,
}: {
  identity: OfficeIdentity;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  const { locale, t } = usePreferences();
  return (
    <article
      className="office-branded-document"
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <header className="office-document-header">
        <div>
          <p className="office-document-name">
            {locale === "ar" ? identity.name_ar : identity.name_en}
          </p>
          {identity.address && <p>{identity.address}</p>}
          <p>{[identity.phone, identity.email].filter(Boolean).join(" · ")}</p>
          {identity.registration && (
            <p>
              {t("السجل", "Registration")} <bdi>{identity.registration}</bdi>
            </p>
          )}
        </div>
        <Image
          src="/logo.png"
          alt={t("شعار مودرن", "Modern logo")}
          width={120}
          height={86}
          unoptimized
          className="office-document-logo"
        />
      </header>
      <h1>{title}</h1>
      {subtitle && <p className="office-document-subtitle">{subtitle}</p>}
      {children}
    </article>
  );
}

export function PrintButton({ children }: { children: ReactNode }) {
  const { t } = usePreferences();
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    let active = true;
    const reset = () => setPrinting(false);
    window.addEventListener("afterprint", reset);
    async function openPrint() {
      const images = document.querySelectorAll<HTMLImageElement>(
        ".office-print-sheet img",
      );
      await Promise.all([
        document.fonts.ready,
        ...Array.from(images, (img) => img.decode().catch(() => {})),
      ]);
      if (active) window.print();
    }
    void openPrint();
    return () => {
      active = false;
      window.removeEventListener("afterprint", reset);
    };
  }, [printing]);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={printing}
        onClick={() => setPrinting(true)}
      >
        <Printer data-icon="inline-start" />
        {t("طباعة / حفظ PDF", "Print / save PDF")}
      </Button>
      {printing &&
        createPortal(
          <div className="office-print-sheet">{children}</div>,
          document.body,
        )}
    </>
  );
}

export function invoiceHeading(
  doc: LedgerDocument,
  t: (ar: string, en: string) => string,
) {
  if (doc.opening) return t("مستند رصيد افتتاحي", "Opening balance document");
  return doc.direction === "sale"
    ? t("فاتورة خدمات", "Service invoice")
    : t("فاتورة مورد", "Supplier bill");
}
export function invoiceStatus(
  doc: LedgerDocument,
  t: (ar: string, en: string) => string,
) {
  if (doc.status === "draft") return t("مسودة", "Draft");
  if (doc.status === "reversed") return t("معكوسة", "Reversed");
  if (doc.status === "cancelled") return t("ملغاة", "Cancelled");
  if (Number(doc.outstanding) === 0) return t("مسوّاة", "Settled");
  return Number(doc.paid) > 0
    ? t("مسددة جزئياً", "Partially paid")
    : t("مستحقة", "Outstanding");
}
export function InvoiceSheet({ doc }: { doc: LedgerDocument }) {
  const { t } = usePreferences();
  if (!doc.office_snapshot) return null;
  return (
    <BrandedSheet
      identity={doc.office_snapshot}
      title={invoiceHeading(doc, t)}
      subtitle={<bdi dir="ltr">{doc.number}</bdi>}
    >
      <dl className="office-document-details">
        <div>
          <dt>{t("الطرف", "Customer / supplier")}</dt>
          <dd>{doc.party_name}</dd>
        </div>
        {doc.project_name && (
          <div>
            <dt>{t("المشروع", "Project")}</dt>
            <dd>{doc.project_name}</dd>
          </div>
        )}
        <div>
          <dt>{t("تاريخ الإصدار", "Issue date")}</dt>
          <dd>
            <bdi>{doc.issue_date}</bdi>
          </dd>
        </div>
        <div>
          <dt>{t("تاريخ الاستحقاق", "Due date")}</dt>
          <dd>
            <bdi>{doc.due_date}</bdi>
          </dd>
        </div>
        <div>
          <dt>{t("الحالة", "Status")}</dt>
          <dd>{invoiceStatus(doc, t)}</dd>
        </div>
        {doc.external_ref && (
          <div>
            <dt>{t("المرجع", "Reference")}</dt>
            <dd>{doc.external_ref}</dd>
          </div>
        )}
      </dl>
      <table>
        <thead>
          <tr>
            <th>{t("البنود", "Items")}</th>
            <th>{t("الكمية", "Qty")}</th>
            <th>{t("سعر الوحدة د.ك", "Unit price KWD")}</th>
            <th>{t("المبلغ د.ك", "Amount KWD")}</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, i) => (
            <tr key={i}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>
                <bdi>{officeMoney(item.price)}</bdi>
              </td>
              <td>
                <bdi>{officeMoney(item.amount)}</bdi>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="office-document-details">
        {[
          [t("الإجمالي د.ك", "Total KWD"), doc.total],
          [t("المدفوع", "Paid"), doc.paid],
          [t("الإشعارات الدائنة", "Credits"), doc.credited],
          [t("المتبقي", "Outstanding"), doc.outstanding],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <bdi>{officeMoney(value)}</bdi>
            </dd>
          </div>
        ))}
      </dl>
      {doc.notes && <p className="office-document-note">{doc.notes}</p>}
      {doc.direction === "sale" && doc.office_snapshot.payment_instructions && (
        <p className="office-document-note">
          {doc.office_snapshot.payment_instructions}
        </p>
      )}
    </BrandedSheet>
  );
}
