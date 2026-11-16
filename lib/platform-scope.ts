import type { PlatformData, User } from "./types";

type Collection = Exclude<keyof PlatformData, "user" | "new_inquiries">;
export const sectionCollections = {
  overview: ["projects", "clients", "documents", "payments", "tasks", "audit"],
  projects: ["projects", "clients"],
  project: [
    "projects",
    "clients",
    "users",
    "assignments",
    "documents",
    "reports",
    "quotations",
    "allocations",
    "payments",
    "tasks",
    "audit",
  ],
  clients: ["clients", "users", "projects"],
  tasks: ["tasks", "projects", "users"],
  files: ["documents", "projects"],
  finance: ["projects", "clients", "quotations", "allocations", "payments"],
  accounting: ["projects", "clients", "allocations"],
  reports: ["projects", "clients", "users"],
  team: ["users"],
  municipality: ["projects", "clients"],
  supervision: ["projects", "clients"],
  whatsapp: ["clients", "notifications", "notification_preferences"],
  inquiries: ["inquiries"],
  portfolio: ["portfolio"],
  audit: ["audit", "projects"],
  settings: [],
} as const satisfies Record<string, readonly Collection[]>;

export type PlatformSection = keyof typeof sectionCollections;
export type PlatformScope = { section: PlatformSection; projectId?: string };

export function pageScope(pathname: string): PlatformScope {
  const [, , section, projectId] = pathname.split("/");
  if (section === "projects" && projectId)
    return { section: "project", projectId };
  return {
    section:
      section && Object.hasOwn(sectionCollections, section)
        ? (section as PlatformSection)
        : "overview",
  };
}

export function scopeKey(scope: PlatformScope) {
  return scope.section + (scope.projectId ? "/" + scope.projectId : "");
}

export function emptyPlatformData(user: User): PlatformData {
  return {
    user,
    projects: [],
    clients: [],
    users: [],
    assignments: [],
    documents: [],
    reports: [],
    quotations: [],
    allocations: [],
    payments: [],
    tasks: [],
    audit: [],
    inquiries: [],
    portfolio: [],
    notifications: [],
    notification_preferences: [],
  };
}
