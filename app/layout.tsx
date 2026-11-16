import type { Metadata } from "next";
import { Geist, Geist_Mono, Tajawal } from "next/font/google";
import "./globals.css";
import { PreferencesProvider } from "@/components/platform/preferences";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "مودرن | للاستشارات الهندسية", template: "%s | مودرن" },
  description:
    "مكتب مودرن للاستشارات الهندسية في الكويت. تصميم الواجهات والتصميم المعماري والإنشائي والأنظمة، التراخيص الحكومية والإشراف الهندسي المتكامل.",
  applicationName: "مودرن",
  robots: { index: true, follow: true },
};

const arabic = Tajawal({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${arabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
