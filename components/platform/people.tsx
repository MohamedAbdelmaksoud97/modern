"use client";
import { useState } from "react";
import { Plus, Search, Pencil, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { roles, type Client, type User } from "@/lib/types";
import { usePlatform } from "./provider";
import { usePreferences } from "./preferences";
import { useLabels } from "./projects";
import {
  ActionForm,
  FormDialog,
  TextField,
  AreaField,
  SelectField,
  NoData,
  formObject,
} from "./forms";
export function Clients() {
  const { data, command } = usePlatform(),
    { t } = usePreferences(),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [edit, setEdit] = useState<Client | null>(null),
    [reset, setReset] = useState<User | null>(null);
  const clients = data.clients.filter((c) =>
    `${c.name} ${c.national_id} ${c.phone}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label mb-2">
            {t("علاقات العملاء", "CLIENT RELATIONSHIPS")}
          </p>
          <h1 className="text-3xl font-medium">{t("العملاء")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "علاقات تبدأ بالثقة، وتستمر بالاهتمام بالتفاصيل.",
              "Relationships built on trust and sustained by attention to detail.",
            )}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" />
          {t("عميل جديد", "New client")}
        </Button>
      </div>
      <div className="relative max-w-xl">
        <label htmlFor="client-search" className="sr-only">
          {t("البحث عن عميل", "Search clients")}
        </label>
        <Search className="absolute start-4 top-4 size-4 text-muted-foreground" />
        <Input
          id="client-search"
          className="ps-11"
          placeholder={t(
            "ابحث بالاسم أو رقم الهوية أو الهاتف…",
            "Search name, national ID or phone…",
          )}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {clients.length ? (
        <div className="data-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("العميل", "Client")}</TableHead>
                <TableHead>{t("رقم الهوية", "National ID")}</TableHead>
                <TableHead>{t("رقم الهاتف", "Phone")}</TableHead>
                <TableHead>{t("المشروعات")}</TableHead>
                <TableHead>{t("الإجراءات", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => {
                const user = data.users.find((u) => u.client_id === c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium">{c.name}</p>
                      <p
                        className="mt-1 text-xs text-muted-foreground"
                        dir="auto"
                      >
                        {c.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      <bdi>{c.national_id}</bdi>
                    </TableCell>
                    <TableCell>
                      <bdi>{c.phone}</bdi>
                    </TableCell>
                    <TableCell>
                      {data.projects.filter((p) => p.client_id === c.id).length}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="px-0!"
                          aria-label={`${t("تعديل")} ${c.name}`}
                          onClick={() => setEdit(c)}
                        >
                          <Pencil />
                        </Button>
                        {user && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="px-0!"
                            aria-label={`${t("إعادة تعيين كلمة المرور", "Reset password")} ${c.name}`}
                            onClick={() => setReset(user)}
                          >
                            <KeyRound />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <NoData
          title={t("لا يوجد عملاء مطابقون", "No matching clients")}
          description={t(
            "أضف أول عميل لبدء رحلته مع المكتب.",
            "Add your first client to start their journey with your office.",
          )}
        />
      )}
      <FormDialog
        open={open || !!edit}
        onOpenChange={(o) => {
          if (!o) {
            setOpen(false);
            setEdit(null);
          }
        }}
        title={
          edit
            ? t("تعديل بيانات العميل", "Edit client")
            : t("عميل جديد", "New client")
        }
        description={
          edit
            ? t(
                "تحديث بيانات العميل، مع الحفاظ على سجل مشروعاته.",
                "Update client information while preserving their project records.",
              )
            : t(
                "يُنشأ حساب للعميل برقم الهوية وكلمة مرور أولية تُعرض بعد الحفظ.",
                "A client account will be created using their national ID and a temporary password shown after saving.",
              )
        }
      >
        <ActionForm
          key={edit?.id || "new"}
          onSubmit={(f) =>
            command(edit ? "update_client" : "create_client", {
              ...formObject(f),
              ...(edit ? { id: edit.id } : {}),
            })
          }
          onSuccess={() => {
            setOpen(false);
            setEdit(null);
          }}
        >
          <TextField
            label={t("اسم العميل", "Client name")}
            name="name"
            defaultValue={edit?.name}
            required
            maxLength={160}
          />
          <TextField
            label={t("رقم الهوية", "National ID")}
            name="national_id"
            defaultValue={edit?.national_id}
            required
            minLength={4}
            maxLength={30}
            dir="ltr"
          />
          <TextField
            label={t("رقم الهاتف الدولي", "International phone number")}
            name="phone"
            defaultValue={edit?.phone}
            required
            pattern="\+?[0-9 ]{8,18}"
            placeholder="+965 5556 3171"
            hint={t(
              "يشمل مفتاح الدولة لاستقبال إشعارات واتساب.",
              "Include the country code for WhatsApp notifications.",
            )}
            dir="ltr"
          />
          <TextField
            label={t("البريد الإلكتروني (اختياري)", "Email address (optional)")}
            name="email"
            defaultValue={edit?.email || ""}
            type="email"
          />
          <AreaField
            label={t("الملاحظات", "Notes")}
            name="notes"
            defaultValue={edit?.notes}
          />
        </ActionForm>
      </FormDialog>
      <PasswordReset user={reset} close={() => setReset(null)} />
    </div>
  );
}
export function Team() {
  const { data, command } = usePlatform(),
    { t } = usePreferences(),
    { roles: labels } = useLabels(),
    [open, setOpen] = useState(false),
    [reset, setReset] = useState<User | null>(null),
    [manage, setManage] = useState<User | null>(null);
  const users = data.users.filter((u) => u.role !== "client"),
    manager = data.user.role === "manager";
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label mb-2">
            {t("الأشخاص خلف الإنجاز", "THE PEOPLE BEHIND OUR WORK")}
          </p>
          <h1 className="text-3xl font-medium">{t("فريق العمل")}</h1>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" />
          {t("إضافة موظف", "Add employee")}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {users.map((u) => (
          <div key={u.id} className="app-panel">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent text-lg text-accent-foreground">
                {u.name.slice(0, 1)}
              </div>
              <Badge variant={u.active ? "secondary" : "outline"}>
                {u.active ? t("نشط", "Active") : t("معطل", "Disabled")}
              </Badge>
            </div>
            <h2 className="mb-2">{u.name}</h2>
            <p className="text-xs text-link">{labels[u.role]}</p>
            <p
              className="mt-3 break-all text-xs text-muted-foreground"
              dir="ltr"
            >
              {u.email}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {manager && u.id !== data.user.id && (
                <Button variant="outline" onClick={() => setManage(u)}>
                  {t("إدارة الحساب", "Manage account")}
                </Button>
              )}
              {u.id !== data.user.id && (manager || u.role !== "manager") && (
                <Button variant="ghost" onClick={() => setReset(u)}>
                  <KeyRound data-icon="inline-start" />
                  {t("كلمة المرور", "Password")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t("إضافة موظف", "Add employee")}
        description={t(
          "استخدم بريدًا داخليًا مشتقًا من اسم المكتب. يجب تغيير كلمة المرور عند أول دخول.",
          "Use an office-based internal email address. The employee must change their password on first sign-in.",
        )}
      >
        <ActionForm
          onSubmit={(f) => command("create_employee", formObject(f))}
          onSuccess={() => setOpen(false)}
        >
          <TextField
            label={t("الاسم الكامل", "Full name")}
            name="name"
            required
          />
          <TextField
            label={t("بريد الموظف", "Employee email")}
            name="email"
            type="email"
            required
            placeholder="architect@modern.internal"
            dir="ltr"
          />
          <SelectField
            label={t("الدور الوظيفي", "Role")}
            name="role"
            options={roles
              .filter((r) => r !== "client" && (manager || r !== "manager"))
              .map((r) => ({ value: r, label: labels[r] }))}
          />
          <TextField
            label={t("كلمة المرور الأولية", "Temporary password")}
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            hint={t(
              "سلّم كلمة المرور للموظف بطريقة آمنة.",
              "Share this password securely with the employee.",
            )}
          />
        </ActionForm>
      </FormDialog>
      <FormDialog
        open={!!manage}
        onOpenChange={(o) => {
          if (!o) setManage(null);
        }}
        title={t("إدارة حساب الموظف", "Manage employee account")}
      >
        <ActionForm
          key={manage?.id}
          onSubmit={(f) =>
            command("update_user", {
              id: manage?.id,
              role: f.get("role"),
              active: f.get("active") === "true",
            })
          }
          onSuccess={() => setManage(null)}
        >
          <SelectField
            label={t("الدور الوظيفي", "Role")}
            name="role"
            defaultValue={manage?.role}
            options={roles
              .filter((r) => r !== "client")
              .map((r) => ({ value: r, label: labels[r] }))}
          />
          <SelectField
            label={t("حالة الحساب", "Account status")}
            name="active"
            defaultValue={String(manage?.active ?? true)}
            options={[
              { value: "true", label: t("نشط", "Active") },
              { value: "false", label: t("معطل", "Disabled") },
            ]}
          />
          <p className="text-xs leading-6 text-muted-foreground">
            {t(
              "تعديل الدور أو تعطيل الحساب ينهي جلسات الموظف فورًا.",
              "Changing the role or disabling the account immediately revokes the employee's sessions.",
            )}
          </p>
        </ActionForm>
      </FormDialog>
      <PasswordReset user={reset} close={() => setReset(null)} />
    </div>
  );
}
function PasswordReset({
  user,
  close,
}: {
  user: User | null;
  close: () => void;
}) {
  const { command } = usePlatform(),
    { t } = usePreferences();
  return (
    <FormDialog
      open={!!user}
      onOpenChange={(o) => {
        if (!o) close();
      }}
      title={t("إعادة تعيين كلمة المرور", "Reset password")}
      description={t(
        "تنتهي جميع جلسات المستخدم ويُطلب منه تغيير كلمة المرور الجديدة عند دخوله.",
        "All sessions are revoked. The user must change this temporary password on their next sign-in.",
      )}
    >
      <ActionForm
        onSubmit={(f) =>
          command("reset_password", {
            id: user?.id,
            password: f.get("password"),
          })
        }
        onSuccess={close}
      >
        <p>{user?.name}</p>
        <TextField
          label={t("كلمة المرور الأولية الجديدة", "New temporary password")}
          name="password"
          type="password"
          required
          minLength={12}
          maxLength={128}
        />
      </ActionForm>
    </FormDialog>
  );
}
