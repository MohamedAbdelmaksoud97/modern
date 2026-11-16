import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/server/auth";
import { WorkspaceFrame } from "@/components/platform/workspace-frame";

async function SecuredWorkspace({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.must_change_password) redirect("/change-password");
  if (user.role === "client") redirect("/portal");
  return <WorkspaceFrame user={user}>{children}</WorkspaceFrame>;
}

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <SecuredWorkspace>{children}</SecuredWorkspace>
    </Suspense>
  );
}
