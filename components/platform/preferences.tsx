"use client";
import {
  createContext,
  useContext,
  useSyncExternalStore,
  useEffect,
  type ReactNode,
} from "react";
import { DirectionProvider } from "@base-ui/react/direction-provider";
type Locale = "ar" | "en";
type Theme = "light" | "dark";
type Preferences = {
  locale: Locale;
  theme: Theme;
  t: (ar: string, en?: string) => string;
  toggleLocale: () => void;
  toggleTheme: () => void;
};
const PreferencesContext = createContext<Preferences | null>(null);
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
function read(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
  for (const listener of listeners) listener();
}
export const englishStages = [
  "Project intake",
  "Architectural design",
  "Civil engineering",
  "Facade drawings",
  "Municipality preparation",
  "Municipality approval",
  "Supervision contract",
  "Site supervision",
  "Supervision closure",
  "Completed",
];
export const englishRoles: Record<string, string> = {
  manager: "Manager",
  secretary: "Secretary",
  accountant: "Accountant",
  architect: "Architect",
  civil_engineer: "Civil engineer",
  draftsman: "Draftsman",
  municipality_draftsman: "Municipality draftsman",
  site_supervisor: "Site supervisor",
  client: "Client",
};
const dictionary: Record<string, string> = {
  حفظ: "Save",
  إلغاء: "Cancel",
  تعديل: "Edit",
  إضافة: "Add",
  "عرض الكل": "View all",
  "لا توجد بيانات بعد": "No data yet",
  "ستظهر البيانات هنا فور إضافتها.":
    "Your records will appear here once added.",
  "تعذر حفظ البيانات": "Unable to save changes.",
  "تعذر الاتصال. حاول مجددًا.": "Unable to connect. Please try again.",
  "جارٍ الحفظ…": "Saving…",
  "اختر من القائمة": "Select an option",
  "أدخل البيانات المطلوبة ثم احفظ التغييرات.":
    "Enter the required information, then save your changes.",
  "نظرة عامة": "Overview",
  المشروعات: "Projects",
  العملاء: "Clients",
  المهام: "Tasks",
  المستندات: "Documents",
  "المالية وعروض الأسعار": "Finance & quotations",
  "حسابات المكتب": "Office accounting",
  "التقارير": "Reports",
  "معاملات البلدية": "Municipality",
  "الإشراف الميداني": "Site supervision",
  "فريق العمل": "Team",
  "إدارة واتساب": "WhatsApp",
  "طلبات التواصل": "Inquiries",
  "سابقة الأعمال": "Portfolio",
  "سجل العمليات": "Audit trail",
  "الحساب والإعدادات": "Account & settings",
  "تفاصيل المشروع": "Project details",
  "مساحة العمل": "Workspace",
  "بوابة العميل": "Client portal",
  "إدارة المكتب": "Office management",
  "الموقع التعريفي": "Visit website",
  "القائمة الرئيسية": "Main navigation",
  "تسجيل الخروج": "Sign out",
  "فتح القائمة": "Open navigation",
  "تخطي إلى المحتوى": "Skip to content",
  "الوضع الفاتح": "Light mode",
  "الوضع الداكن": "Dark mode",
  "قائمة مساحة العمل": "Workspace navigation",
  "التنقل بين أقسام المكتب": "Navigate office departments",
  "مكتب مودرن للاستشارات الهندسية": "Modern Engineering Consultancy",
  "للاستشارات الهندسية": "Engineering consultancy",
  مودرن: "Modern",
  "العودة إلى الموقع": "Back to website",
  "مرحبًا بك في مودرن": "Welcome to Modern",
  "تغيير كلمة المرور": "Change password",
  "مساحة واحدة تجمع تفاصيل مشروعك، وفريق العمل، وكل خطوة نحو الإنجاز.":
    "One place for your project, your team and every step toward completion.",
  "اختر كلمة مرور جديدة لحماية حسابك. يجب تغيير كلمة المرور الأولية قبل متابعة استخدام المنصة.":
    "Choose a new password to protect your account. Change your temporary password before continuing.",
  "حفظ كلمة المرور": "Save password",
  "تسجيل الدخول": "Sign in",
  "البريد الإلكتروني أو رقم الهوية": "Email address or national ID",
  "البريد للموظف · رقم الهوية للعميل": "Staff email · Client national ID",
  "كلمة المرور": "Password",
  "كلمة المرور الحالية": "Current password",
  "كلمة المرور الجديدة": "New password",
  "إخفاء كلمة المرور": "Hide password",
  "إظهار كلمة المرور": "Show password",
  "12 حرفًا على الأقل. اختر كلمة مختلفة عن كلمة المرور الحالية.":
    "At least 12 characters. Choose a password different from your current password.",
  "بيانات الدخول تصدرها إدارة المكتب. لاستعادة حسابك، تواصل مع السكرتارية.":
    "Your account is issued by the office. Contact the secretary for account recovery.",
  "مساحة خاصة وآمنة لعملاء وموظفي المكتب":
    "A private workspace for our clients and team",
  "تفاصيل مدروسة.": "Considered details.",
  "رؤية تُبنى على الثقة.": "A vision built on trust.",
  "من أول فكرة إلى آخر تفصيلة في الموقع، نرافق مشروعك بخبرة هندسية ووضوح في كل مرحلة.":
    "From the first idea to the final site detail, we guide your project with engineering expertise and clarity at every stage.",
  "تم حفظ التغييرات بنجاح": "Changes saved successfully",
  "إعادة المحاولة": "Try again",
  "جارٍ تحميل مساحة العمل…": "Loading your workspace…",
  "تعذر تحميل بيانات المكتب. أعد المحاولة.":
    "Could not load office data. Please try again.",
  "تعذر الاتصال بالخادم": "Could not connect to the server.",
  "ليست لديك صلاحية الوصول":
    "You do not have permission to access this resource.",
  "انتهت الجلسة. سجّل دخولك من جديد.":
    "Your session has expired. Please sign in again.",
  "تعذر إتمام العملية": "Could not complete the operation.",
  "تعذر الاتصال بالخادم. تحقق من الاتصال ثم أعد المحاولة.":
    "Could not connect to the server. Check your connection and try again.",
  "إغلاق التنبيه": "Dismiss notification",
  "بيانات الدخول الجديدة": "New account credentials",
  "تظهر كلمة المرور مرة واحدة. سلّمها لصاحب الحساب بطريقة آمنة، وسيُطلب منه تغييرها عند أول دخول.":
    "This password is shown once. Share it securely with the account holder, who must change it on their first sign-in.",
  "اسم المستخدم:": "Username:",
  "كلمة المرور:": "Password:",
  "تم استلام البيانات": "I have saved these credentials",
  "مشروع جديد": "New project",
  "إجمالي المشروعات": "Total projects",
  مشروعاتك: "Your projects",
  "في الإشراف الميداني": "Under supervision",
  "متابعة مستمرة للموقع": "Continuous site follow-up",
  "إجمالي المحصل": "Total collected",
  "المهام المفتوحة": "Open tasks",
  "دفعات مسجلة في النظام": "Recorded payments",
  "مهام قيد العمل": "Tasks in progress",
  "المتبقي من التعاقدات": "Outstanding balance",
  "مشروعات مكتملة": "Completed projects",
  "وفق البيانات المتاحة لك": "Based on data shared with you",
  "رحلة هندسية مكتملة": "Completed engineering journeys",
  "المشروعات الأخيرة": "Recent projects",
  "رحلة مشروعك تبدأ من هنا": "Your project journey starts here",
  "سيظهر مشروعك هنا عند تسجيله بواسطة المكتب.":
    "Your project will appear here once registered by the office.",
  "أضف أول عميل ومشروع لبدء تنظيم العمل داخل المكتب.":
    "Add your first client and project to start organizing your office.",
  "رحلة المشروع": "Project journey",
  "توزيع مراحل العمل": "Workflow overview",
  "آخر تحديثات مشروعك": "Latest project updates",
  "سجل النشاط الأخير": "Recent activity",
  "لا توجد تحديثات لعرضها حاليًا.": "There are no updates to show yet.",
  "كل مرحلة مدروسة.": "Every stage considered.",
  "كل تفصيلة محفوظة.": "Every detail preserved.",
  "المستندات والتقارير والمراسلات مرتبطة بمشروعك، لتبقى الصورة واضحة من البداية حتى التسليم.":
    "Documents, reports and correspondence stay connected to your project, keeping the picture clear from start to handover.",
  "تصفح المستندات": "Browse documents",
  "رؤية أوضح لمشروعات المكتب، وخطوة أقرب إلى إنجازها.":
    "A clearer view of your office projects, one step closer to completion.",
  "كل تفاصيل مشروعك في مكان واحد. تابع رحلته معنا خطوة بخطوة.":
    "All your project details in one place. Follow its journey with us, step by step.",
};
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const rawLocale = useSyncExternalStore(
    subscribe,
    () => read("modern_locale", "ar"),
    () => "ar",
  );
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const rawTheme = useSyncExternalStore(
    subscribe,
    () => read("modern_theme", "light"),
    () => "light",
  );
  const theme: Theme = rawTheme === "dark" ? "dark" : "light";
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [locale, theme]);
  const value: Preferences = {
    locale,
    theme,
    t: (ar, en) => (locale === "ar" ? ar : en || dictionary[ar] || ar),
    toggleLocale: () => write("modern_locale", locale === "ar" ? "en" : "ar"),
    toggleTheme: () =>
      write("modern_theme", theme === "dark" ? "light" : "dark"),
  };
  return (
    <PreferencesContext value={value}>
      <DirectionProvider direction={locale === "ar" ? "rtl" : "ltr"}>
        {children}
      </DirectionProvider>
    </PreferencesContext>
  );
}
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("Preferences provider missing");
  return context;
}
