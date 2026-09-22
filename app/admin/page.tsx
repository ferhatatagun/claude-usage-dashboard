import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const tokenFormat = new Intl.NumberFormat("tr-TR");
const moneyFormat = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "USD",
});
const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Istanbul",
});

/** Bir organizasyonun panelde gösterilen özeti. */
type OrgSummary = {
  id: string;
  name: string;
  planType: string;
  createdAt: string;
  memberCount: number;
  pendingInvites: number;
  hasKey: boolean;
  costUsd: number;
  tokens: number;
};

/** Kimlikten sayıya çeviren küçük yardımcı; birden çok yerde toplarız. */
function tally<T>(rows: T[] | null, key: (row: T) => string) {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    const id = key(row);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export default async function AdminPage() {
  // Yetki kontrolü layout'ta yapıldı. Buradaki okumalar yönetici
  // istemcisiyle yapılır; tek sorguda tüm organizasyonları toplamanın
  // RLS üzerinden yolu yok.
  const admin = createAdminClient();

  const [
    { data: orgs },
    { data: members },
    { data: invites },
    { data: keys },
    { data: costs },
    { data: usage },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name, plan_type, created_at")
      .order("created_at", { ascending: true }),
    admin.from("organization_members").select("org_id"),
    admin.from("organization_invites").select("org_id").eq("status", "pending"),
    admin
      .from("api_keys")
      .select("org_id")
      .eq("key_type", "admin_usage_cost")
      .is("revoked_at", null),
    admin.from("cost_daily").select("org_id, amount_cents"),
    admin
      .from("usage_daily")
      .select(
        "org_id, uncached_input_tokens, cache_read_input_tokens, cache_creation_input_tokens, output_tokens"
      ),
  ]);

  const memberCounts = tally(members, (r) => r.org_id as string);
  const inviteCounts = tally(invites, (r) => r.org_id as string);
  const keyed = new Set((keys ?? []).map((r) => r.org_id as string));

  const costByOrg = new Map<string, number>();
  for (const row of costs ?? []) {
    const id = row.org_id as string;
    costByOrg.set(id, (costByOrg.get(id) ?? 0) + (row.amount_cents ?? 0) / 100);
  }

  const tokensByOrg = new Map<string, number>();
  for (const row of usage ?? []) {
    const id = row.org_id as string;
    const total =
      (row.uncached_input_tokens ?? 0) +
      (row.cache_read_input_tokens ?? 0) +
      (row.cache_creation_input_tokens ?? 0) +
      (row.output_tokens ?? 0);
    tokensByOrg.set(id, (tokensByOrg.get(id) ?? 0) + total);
  }

  const summaries: OrgSummary[] = (orgs ?? []).map((org) => ({
    id: org.id as string,
    name: org.name as string,
    planType: org.plan_type as string,
    createdAt: org.created_at as string,
    memberCount: memberCounts.get(org.id as string) ?? 0,
    pendingInvites: inviteCounts.get(org.id as string) ?? 0,
    hasKey: keyed.has(org.id as string),
    costUsd: costByOrg.get(org.id as string) ?? 0,
    tokens: tokensByOrg.get(org.id as string) ?? 0,
  }));

  const totalMembers = summaries.reduce((sum, o) => sum + o.memberCount, 0);
  const totalCost = summaries.reduce((sum, o) => sum + o.costUsd, 0);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight">
          {summaries.length} organizasyon
        </h1>
        <p className="text-sm text-muted-foreground">
          {totalMembers} üye
          {totalCost > 0 && ` · toplam ${moneyFormat.format(totalCost)}`}
        </p>
      </div>

      {summaries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Henüz hiçbir organizasyon oluşturulmamış.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {summaries.map((org) => (
            <Link key={org.id} href={`/admin/${org.id}`} className="group">
              <Card className="transition-colors group-hover:border-primary/40">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <CardTitle className="flex items-center gap-2.5 text-base">
                        {org.name}
                        <Badge variant="secondary">
                          {org.planType === "enterprise"
                            ? "Enterprise"
                            : "Team"}
                        </Badge>
                        {org.hasKey ? (
                          <Badge variant="outline">Anahtar bağlı</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Anahtar yok
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {org.memberCount} üye
                        {org.pendingInvites > 0 &&
                          ` · ${org.pendingInvites} bekleyen davet`}
                        {` · ${dateFormat.format(new Date(org.createdAt))} tarihinde kuruldu`}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="flex flex-col items-end">
                        <span className="font-heading text-lg tracking-tight">
                          {org.costUsd > 0
                            ? moneyFormat.format(org.costUsd)
                            : "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {org.tokens > 0
                            ? `${tokenFormat.format(org.tokens)} token`
                            : "veri yok"}
                        </span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
