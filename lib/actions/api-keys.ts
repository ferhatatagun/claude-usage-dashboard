"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminKey } from "@/lib/anthropic/admin";

type ActionResult =
  | { error: string; organizationName?: undefined }
  | { error: null; organizationName?: string | null };

/**
 * Anahtarın sadece son 4 hanesini saklarız — kullanıcı panelde hangi anahtarı
 * bağladığını tanısın diye. Tam anahtar veritabanına asla düz metin yazılmaz.
 */
function previewOf(secret: string) {
  return `…${secret.slice(-4)}`;
}

/** Çağıranın ilgili organizasyonun admini olduğunu doğrular. */
async function requireOrgAdmin(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." as const, user: null };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    return { error: "Bu işlem için yetkiniz yok." as const, user: null };
  }

  return { error: null, user };
}

export async function saveApiKey(formData: FormData): Promise<ActionResult> {
  const orgId = String(formData.get("orgId") ?? "");
  const secret = String(formData.get("secret") ?? "").trim();

  if (!secret) {
    return { error: "Anahtar boş olamaz." };
  }
  if (!secret.startsWith("sk-ant-admin")) {
    return {
      error:
        "Bu bir Admin API anahtarı değil. Anahtar sk-ant-admin ile başlamalı.",
    };
  }

  const auth = await requireOrgAdmin(orgId);
  if (auth.error) return { error: auth.error };

  // Kaydetmeden önce Anthropic'e sorup anahtarın gerçekten çalıştığını
  // doğruluyoruz; çalışmayan bir anahtarı kasaya koymanın anlamı yok.
  const verified = await verifyAdminKey(secret);
  if (!verified.ok) return { error: verified.reason };

  const admin = createAdminClient();
  const { error } = await admin.rpc("store_api_key", {
    p_org_id: orgId,
    p_key_type: "admin_usage_cost",
    p_secret: secret,
    p_preview: previewOf(secret),
    p_created_by: auth.user!.id,
  });

  if (error) {
    return { error: "Anahtar kaydedilemedi. Lütfen tekrar deneyin." };
  }

  revalidatePath("/dashboard");
  return { error: null, organizationName: verified.organizationName };
}

export async function revokeApiKey(apiKeyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const admin = createAdminClient();

  // Anahtarın hangi organizasyona ait olduğunu bulup yetkiyi ona göre kontrol
  // ederiz; aksi halde id'yi bilen herkes başkasının anahtarını silebilirdi.
  const { data: key } = await admin
    .from("api_keys")
    .select("org_id")
    .eq("id", apiKeyId)
    .maybeSingle();

  if (!key) return { error: "Anahtar bulunamadı." };

  const auth = await requireOrgAdmin(key.org_id);
  if (auth.error) return { error: auth.error };

  const { error } = await admin.rpc("revoke_api_key", {
    p_api_key_id: apiKeyId,
  });

  if (error) return { error: "Anahtar silinemedi. Lütfen tekrar deneyin." };

  revalidatePath("/dashboard");
  return { error: null };
}
