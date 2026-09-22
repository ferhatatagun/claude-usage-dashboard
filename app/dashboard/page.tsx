import { redirect } from "next/navigation";
import { Building2, LogOut, Mail, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOut } from "@/lib/actions/auth";
import { CreateOrgForm } from "./create-org-form";
import { InviteForm } from "./invite-form";
import { AcceptInviteButton, RevokeInviteButton } from "./invite-actions";
import { ApiKeyCard, type ApiKeyRow } from "./api-key-card";
import {
  UsageSummary,
  type CostDailyRow,
  type UsageDailyRow,
} from "./usage-summary";
import { MemberUsage, type UsageRecordRow } from "./member-usage";
import { CsvUploadCard } from "./csv-upload-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function DashboardShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <span className="font-heading text-xl tracking-tight">
            Claude Usage Dashboard
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {email}
            </span>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                <LogOut />
                Çıkış
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        {children}
      </main>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, plan_type)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    const { data: pendingInvites } = await supabase
      .from("organization_invites")
      .select("id, role, organizations(name)")
      .eq("email", user.email!.toLowerCase())
      .eq("status", "pending");

    return (
      <DashboardShell email={user.email!}>
        {pendingInvites && pendingInvites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="size-4 text-primary" />
                Bekleyen davetleriniz
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {pendingInvites.map((invite) => {
                const org = Array.isArray(invite.organizations)
                  ? invite.organizations[0]
                  : invite.organizations;
                return (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
                  >
                    <div className="flex items-center gap-2.5 text-sm">
                      <span className="font-medium">
                        {org?.name ?? "Organizasyon"}
                      </span>
                      <Badge variant="secondary">
                        {invite.role === "admin" ? "Admin" : "Üye"}
                      </Badge>
                    </div>
                    <AcceptInviteButton inviteId={invite.id} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-primary" />
              Yeni organizasyon oluştur
            </CardTitle>
            <CardDescription>
              Henüz bir organizasyona bağlı değilsiniz. Kendi organizasyonunuzu
              oluşturarak başlayabilir veya bir davet bekleyebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateOrgForm />
          </CardContent>
        </Card>
      </DashboardShell>
    );
  }

  const org = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;
  const isAdmin = membership.role === "admin";

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("organization_members")
    .select("id, user_id, role, created_at")
    .eq("org_id", org!.id)
    .order("created_at", { ascending: true });

  const memberEmails = new Map<string, string>();
  if (members) {
    await Promise.all(
      members.map(async (m) => {
        const { data } = await admin.auth.admin.getUserById(m.user_id);
        if (data.user?.email) memberEmails.set(m.user_id, data.user.email);
      })
    );
  }

  const { data: invites } = isAdmin
    ? await admin
        .from("organization_invites")
        .select("id, email, role")
        .eq("org_id", org!.id)
        .eq("status", "pending")
    : { data: null };

  // Sadece iptal edilmemiş anahtarlar. Tam anahtar burada okunmaz; yalnızca
  // son 4 haneyi tutan onizleme ve kullanim tarihleri gelir.
  const { data: apiKeys } = isAdmin
    ? await admin
        .from("api_keys")
        .select("id, key_preview, created_at, last_used_at")
        .eq("org_id", org!.id)
        .eq("key_type", "admin_usage_cost")
        .is("revoked_at", null)
    : { data: null };

  // Kullanim ve maliyet satirlari RLS ile korunur; uye olan herkes kendi
  // organizasyonunun verisini gorur.
  const [{ data: usageDaily }, { data: costDaily }, { data: usageRecords }] =
    await Promise.all([
      supabase
        .from("usage_daily")
        .select(
          "usage_date, model, uncached_input_tokens, cache_read_input_tokens, cache_creation_input_tokens, output_tokens"
        )
        .eq("org_id", org!.id)
        .order("usage_date", { ascending: true }),
      supabase
        .from("cost_daily")
        .select("usage_date, amount_cents")
        .eq("org_id", org!.id),
      supabase
        .from("usage_records")
        .select(
          "user_email, model, input_tokens, output_tokens, cost_usd, usage_date"
        )
        .eq("org_id", org!.id)
        .order("usage_date", { ascending: true }),
    ]);

  return (
    <DashboardShell email={user.email!}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl tracking-tight">{org?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {org?.plan_type === "enterprise" ? "Enterprise" : "Team"} planı ·
            Rolünüz: {isAdmin ? "Admin" : "Üye"}
          </p>
        </div>
      </div>

      <UsageSummary
        usage={(usageDaily ?? []) as UsageDailyRow[]}
        cost={(costDaily ?? []) as CostDailyRow[]}
      />

      <MemberUsage records={(usageRecords ?? []) as UsageRecordRow[]} />

      {isAdmin && (
        <ApiKeyCard orgId={org!.id} keys={(apiKeys ?? []) as ApiKeyRow[]} />
      )}

      {isAdmin && <CsvUploadCard orgId={org!.id} />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" />
            Ekip üyeleri
          </CardTitle>
          <CardDescription>
            {members?.length ?? 0} üye
            {invites && invites.length > 0
              ? ` · ${invites.length} bekleyen davet`
              : ""}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col divide-y divide-border">
            {members?.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 text-sm"
              >
                <span>{memberEmails.get(m.user_id) ?? m.user_id}</span>
                <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                  {m.role === "admin" ? "Admin" : "Üye"}
                </Badge>
              </div>
            ))}
          </div>

          {isAdmin && invites && invites.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Bekleyen davetler
              </h3>
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-muted-foreground">
                      {invite.email}
                    </span>
                    <Badge variant="outline">
                      {invite.role === "admin" ? "Admin" : "Üye"}
                    </Badge>
                  </div>
                  <RevokeInviteButton inviteId={invite.id} />
                </div>
              ))}
            </div>
          )}

          {isAdmin && (
            <div className="flex flex-col gap-3 border-t border-border pt-6">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Yeni üye davet et
              </h3>
              <InviteForm orgId={org!.id} />
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
