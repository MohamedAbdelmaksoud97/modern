"use client";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { usePlatform } from "./provider";
import { navigation } from "./shell";
import { Dashboard } from "./dashboard";
import { Projects, ProjectDetail } from "./projects";
import { Clients, Team } from "./people";
import { AllDocuments } from "./project-documents";
import { Finance } from "./project-finance";
import { Tasks } from "./tasks";
import {
  Inquiries,
  PortfolioAdmin,
  AuditTrail,
  AccountSettings,
} from "./administration";
import { NoData } from "./forms";
import { usePreferences } from "./preferences";
import { SectionLoading } from "./workspace-frame";
const OfficeAccounting = dynamic(
  () => import("./office-accounting").then((m) => m.OfficeAccounting),
  { loading: SectionLoading },
);
const OfficeReports = dynamic(
  () => import("./office-reports").then((m) => m.OfficeReports),
  { loading: SectionLoading },
);
const WhatsApp = dynamic(() => import("./whatsapp").then((m) => m.WhatsApp), {
  loading: SectionLoading,
});
function Content({ portal }: { portal: boolean }) {
  const { data } = usePlatform(),
    { t } = usePreferences();
  const path = usePathname().split("/").filter(Boolean),
    section = path[1] || "";
  const allowed = portal
    ? ["", "projects", "files", "settings"].includes(section)
    : navigation.some(
        (n) =>
          n.key === section && (!n.roles || n.roles.includes(data.user.role)),
      );
  if (!allowed)
    return (
      <NoData
        title={t("الصفحة غير متاحة", "Page unavailable")}
        description={t(
          "ليس لديك صلاحية الوصول لهذا القسم.",
          "Your account does not have access to this section.",
        )}
      />
    );
  switch (section) {
    case "projects":
      return path[2] ? (
        <ProjectDetail key={path[2]} id={path[2]} portal={portal} />
      ) : (
        <Projects portal={portal} />
      );
    case "clients":
      return <Clients />;
    case "tasks":
      return <Tasks />;
    case "files":
      return <AllDocuments portal={portal} />;
    case "finance":
      return <Finance />;
    case "accounting":
      return <OfficeAccounting />;
    case "reports":
      return <OfficeReports />;
    case "team":
      return <Team />;
    case "municipality":
      return <Projects filter="municipality" />;
    case "supervision":
      return <Projects filter="supervision" />;
    case "whatsapp":
      return <WhatsApp />;
    case "inquiries":
      return <Inquiries />;
    case "portfolio":
      return <PortfolioAdmin />;
    case "audit":
      return <AuditTrail />;
    case "settings":
      return <AccountSettings />;
    default:
      return <Dashboard portal={portal} />;
  }
}
export function Workspace({ portal = false }: { portal?: boolean }) {
  return <Content portal={portal} />;
}
