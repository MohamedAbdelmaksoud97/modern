import type { Metadata } from "next";
import { AuthForm } from "@/components/platform/auth-form";
export const metadata: Metadata = {
  title: "تغيير كلمة المرور",
  robots: { index: false, follow: false },
};
export default function PasswordPage() {
  return <AuthForm changePassword />;
}
