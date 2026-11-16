import type { Metadata } from "next";
import { Workspace } from "@/components/platform/workspace";
export const metadata: Metadata = {
  title: "بوابة العميل",
  robots: { index: false, follow: false },
};
export default function PortalPage() {
  return <Workspace portal />;
}
