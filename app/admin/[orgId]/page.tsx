import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { MemberUsage, type UsageRecordRow } from "@/app/dashboard/member-usage";
import {
  UsageSummary,
  type CostDailyRow,
  type UsageDailyRow,
} from "@/app/dashboard/usage-summary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Istanbul",
});

export default async function AdminOrgPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  // Yetki kontrolü layout'ta yapıldı.
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, plan_type, created_at")
    .eq("id", orgId)
    .maybeSingle();

  if (!org) notFound();

  const [
    { data: members },
    { data: invites },
    { data: apiKeys },
    { data: usageDaily },
    { data: costDaily },
    { data: usageRecords },
  ] = await Promise.all([
    admin
      .from("organization_members")
      .select("id, user_id, role, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true }),
    admin
      .from("organization_invites")
      .select("id, email, role")
      .eq("org_id", orgId)
      .eq("status", "pending"),
    admin
      .from("api_keys")
      .select("key_preview, created_at, last_used_at")
      .eq("org_id", orgId)
      .eq("key_type", "admin_usage_cost")
      .is("revoked_at", null),
    admin
      .from("usage_daily")
      .select(
        "usage_date, model, uncached_input_tokens, cache_read_input_tokens, cache_creation_input_tokens, output_tokens"
      )
      .eq("org_id", orgId)
      .order("usage_date", { ascending: true }),
    admin.from("cost_daily").select("usage_date, amount_cents").eq("org_id", orgId),
    admin
      .from("usage_records")
      .select("user_email, model, input_tokens, output_tokens, cost_usd, usage_date")
      .eq("org_id", orgId)
      .order("usage_date", { ascending: true }),
  ]);

  // auth.users tablosu doğrudan sorgulanamaz; adresleri tek tek çözeriz.
  const emails = new Map<string, string>();
  await Promise.all(
    (members ?? []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id as string);
      if (data.user?.email) emails.set(m.user_id as string, data.user.email);
    })
  );

  const activeKey = apiKeys?.[0] ?? null;

  return (
    <>
      <div className="flex flex-col gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 self-start text-muted-foreground"
        >
          <Link href="/admin">
            <ArrowLeft />
            Tüm organizasyonlar
          </Link>
        </Button>

        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl tracking-tight">{org.name}</h1>
          <p className="text-sm text-muted-foreground">
            {org.plan_type === "enterprise" ? "Enterprise" : "Team"} planı ·{" "}
            {dateFormat.format(new Date(org.created_at as string))} tarihinde
            kuruldu
          </p>
        </div>
      </div>

      <UsageSummary
        usage={(usageDaily ?? []) as UsageDailyRow[]}
        cost={(costDaily ?? []) as CostDailyRow[]}
      />

      <MemberUsage records={(usageRecords ?? []) as UsageRecordRow[]} />

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
            {activeKey
              ? ` · anahtar ${activeKey.key_preview} bağlı`
              : " · bağlı anahtar yok"}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col divide-y divide-border">
            {members?.map((m) => (
              <div
                key={m.id as string}
                className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0"
              >
                <span>
                  {emails.get(m.user_id as string) ?? (m.user_id as string)}
                </span>
                <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                  {m.role === "admin" ? "Admin" : "Üye"}
                </Badge>
              </div>
            ))}
          </div>

          {invites && invites.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Bekleyen davetler
              </h3>
              {invites.map((invite) => (
                <div
                  key={invite.id as string}
                  className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm"
                >
                  <span className="text-muted-foreground">
                    {invite.email as string}
                  </span>
                  <Badge variant="outline">
                    {invite.role === "admin" ? "Admin" : "Üye"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
