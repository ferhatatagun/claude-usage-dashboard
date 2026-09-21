"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCost, fetchUsage } from "@/lib/anthropic/usage";

type SyncResult =
  | { error: string; days?: undefined }
  | { error: null; days: number };

/** Anthropic'in tek istekte döndürebileceği en uzun günlük aralık. */
const MAX_DAYS = 31;

/**
 * Organizasyonun kayıtlı Admin anahtarıyla son 31 günün kullanım ve maliyet
 * verisini çeker, `usage_daily` / `cost_daily` tablolarına yazar.
 *
 * Anahtar yalnızca bu fonksiyonun belleğinde çözülür: Vault'tan okunur,
 * Anthropic'e gönderilir ve döndürülmez, loglanmaz, tarayıcıya gitmez.
 */
export async function syncUsage(orgId: string): Promise<SyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || membership.role !== "admin") {
    return { error: "Bu işlem için yetkiniz yok." };
  }

  const admin = createAdminClient();

  const { data: apiKey } = await admin
    .from("api_keys")
    .select("id")
    .eq("org_id", orgId)
    .eq("key_type", "admin_usage_cost")
    .is("revoked_at", null)
    .maybeSingle();

  if (!apiKey) {
    return { error: "Önce bir Admin API anahtarı bağlayın." };
  }

  const { data: secret, error: secretError } = await admin.rpc("read_api_key", {
    p_api_key_id: apiKey.id,
  });

  if (secretError || typeof secret !== "string" || !secret) {
    return { error: "Anahtar okunamadı. Anahtarı yeniden bağlamayı deneyin." };
  }

  const endingAt = new Date();
  const startingAt = new Date(endingAt);
  startingAt.setUTCDate(startingAt.getUTCDate() - MAX_DAYS);
  startingAt.setUTCHours(0, 0, 0, 0);

  const usage = await fetchUsage(secret, startingAt, endingAt);
  if (!usage.ok) return { error: usage.reason };

  const cost = await fetchCost(secret, startingAt, endingAt);
  if (!cost.ok) return { error: cost.reason };

  // Aynı gün + model (veya gün + açıklama) için birden fazla satır gelirse
  // tek satıra toplarız; benzersiz indeks bunu zaten gerektiriyor.
  const usageByKey = new Map<string, Record<string, unknown>>();
  for (const row of usage.rows) {
    const key = `${row.usageDate}|${row.model}`;
    const existing = usageByKey.get(key);
    if (existing) {
      existing.uncached_input_tokens =
        (existing.uncached_input_tokens as number) + row.uncachedInputTokens;
      existing.cache_read_input_tokens =
        (existing.cache_read_input_tokens as number) + row.cacheReadInputTokens;
      existing.cache_creation_input_tokens =
        (existing.cache_creation_input_tokens as number) +
        row.cacheCreationInputTokens;
      existing.output_tokens =
        (existing.output_tokens as number) + row.outputTokens;
      existing.web_search_requests =
        (existing.web_search_requests as number) + row.webSearchRequests;
      continue;
    }
    usageByKey.set(key, {
      org_id: orgId,
      usage_date: row.usageDate,
      model: row.model,
      uncached_input_tokens: row.uncachedInputTokens,
      cache_read_input_tokens: row.cacheReadInputTokens,
      cache_creation_input_tokens: row.cacheCreationInputTokens,
      output_tokens: row.outputTokens,
      web_search_requests: row.webSearchRequests,
      synced_at: new Date().toISOString(),
    });
  }

  const costByKey = new Map<string, Record<string, unknown>>();
  for (const row of cost.rows) {
    const key = `${row.usageDate}|${row.description}`;
    const existing = costByKey.get(key);
    if (existing) {
      existing.amount_cents =
        (existing.amount_cents as number) + row.amountCents;
      continue;
    }
    costByKey.set(key, {
      org_id: orgId,
      usage_date: row.usageDate,
      description: row.description,
      amount_cents: row.amountCents,
      currency: row.currency,
      synced_at: new Date().toISOString(),
    });
  }

  const usageRows = [...usageByKey.values()];
  const costRows = [...costByKey.values()];

  if (usageRows.length > 0) {
    const { error } = await admin
      .from("usage_daily")
      .upsert(usageRows, { onConflict: "org_id,usage_date,model" });
    if (error) return { error: "Kullanım verisi kaydedilemedi." };
  }

  if (costRows.length > 0) {
    const { error } = await admin
      .from("cost_daily")
      .upsert(costRows, { onConflict: "org_id,usage_date,description" });
    if (error) return { error: "Maliyet verisi kaydedilemedi." };
  }

  revalidatePath("/dashboard");

  const days = new Set([
    ...usage.rows.map((r) => r.usageDate),
    ...cost.rows.map((r) => r.usageDate),
  ]).size;

  return { error: null, days };
}
