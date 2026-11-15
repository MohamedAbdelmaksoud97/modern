import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/server/auth";
import { Workspace } from "@/components/platform/workspace";
export const metadata: Metadata = {
  title: "إدارة المكتب",
  robots: { index: false, follow: false },
};
async function SecuredWorkspace() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.must_change_password) redirect("/change-password");
  if (user.role === "client") redirect("/portal");
  return <Workspace />;
}
export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <SecuredWorkspace />
    </Suspense>
  );
}
