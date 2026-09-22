"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncOrg, type SyncOrgResult } from "@/lib/anthropic/sync";

/**
 * Panelden "Veriyi yenile" düğmesiyle tetiklenen elle senkron. Asıl işi
 * `syncOrg` yapar; burada yalnızca oturum ve admin yetkisi doğrulanır.
 */
export async function syncUsage(orgId: string): Promise<SyncOrgResult> {
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

  const result = await syncOrg(orgId);
  if (result.error === null) revalidatePath("/dashboard");
  return result;
}
