"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult =
  | { error: string; warning?: undefined }
  | { error: null; warning?: string };

/** Davet ve giriş bağlantılarının döneceği mutlak adres. */
function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  );
}

export async function createOrganization(
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return { error: "Organizasyon adı en az 2 karakter olmalı." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const { data: existing } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return { error: "Zaten bir organizasyona bağlısınız." };
  }

  const admin = createAdminClient();
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name, plan_type: "team" })
    .select("id")
    .single();
  if (orgError || !org) {
    return { error: "Organizasyon oluşturulamadı." };
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({ org_id: org.id, user_id: user.id, role: "admin" });
  if (memberError) {
    await admin.from("organizations").delete().eq("id", org.id);
    return { error: "Organizasyon oluşturulamadı." };
  }

  revalidatePath("/dashboard");
  return { error: null };
}

export async function inviteMember(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const orgId = String(formData.get("orgId") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "member";

  if (!email.includes("@")) {
    return { error: "Geçerli bir e-posta girin." };
  }

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
  const { error } = await admin.from("organization_invites").upsert(
    {
      org_id: orgId,
      email,
      role,
      invited_by: user.id,
      status: "pending",
    },
    { onConflict: "org_id,email" }
  );
  if (error) {
    return { error: "Davet kaydedilemedi." };
  }

  revalidatePath("/dashboard");

  // Davet satırı yazıldı; şimdi e-postayı gönder. Gönderim başarısız olsa da
  // davet geçerli kalır, bu yüzden hatayı uyarı olarak döndürürüz.
  const redirectTo = `${siteUrl()}/dashboard`;

  const { error: inviteMailError } = await admin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo }
  );

  if (!inviteMailError) return { error: null };

  // Adres zaten kayıtlıysa davet maili gönderilemez; bunun yerine giriş
  // bağlantısı yollarız, kullanıcı giriş yapınca daveti panelde görür.
  const { error: otpError } = await admin.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  if (!otpError) return { error: null };

  return {
    error: null,
    warning: `Davet kaydedildi ama e-posta gönderilemedi: ${otpError.message}`,
  };
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("organization_invites")
    .delete()
    .eq("id", inviteId);
  if (error) return { error: "Davet iptal edilemedi." };

  revalidatePath("/dashboard");
  return { error: null };
}

export async function acceptInvite(inviteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Oturum bulunamadı." };

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("organization_invites")
    .select("org_id, email, role, status")
    .eq("id", inviteId)
    .maybeSingle();

  if (
    !invite ||
    invite.status !== "pending" ||
    invite.email.toLowerCase() !== user.email.toLowerCase()
  ) {
    return { error: "Davet geçersiz veya süresi dolmuş." };
  }

  const { data: existing } = await admin
    .from("organization_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return { error: "Zaten bir organizasyona bağlısınız." };
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({ org_id: invite.org_id, user_id: user.id, role: invite.role });
  if (memberError) return { error: "Katılım başarısız oldu." };

  await admin
    .from("organization_invites")
    .update({ status: "accepted" })
    .eq("id", inviteId);

  revalidatePath("/dashboard");
  return { error: null };
}
