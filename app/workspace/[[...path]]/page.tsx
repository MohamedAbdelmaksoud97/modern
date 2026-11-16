import type { Metadata } from "next";
import { Workspace } from "@/components/platform/workspace";
export const metadata: Metadata = {
  title: "إدارة المكتب",
  robots: { index: false, follow: false },
};
export default function WorkspacePage() {
  return <Workspace />;
}
