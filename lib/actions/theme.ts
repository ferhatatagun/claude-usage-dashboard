"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidThemeColor, type ThemeFont } from "@/lib/theme";

type ActionResult = { error: string | null };

const ALLOWED_FONTS: ThemeFont[] = ["geist", "inter", "ibm-plex", "system"];

function parseThemeInput(formData: FormData): {
  font: ThemeFont | null;
  color: string | null;
  error: string | null;
} {
  const fontRaw = String(formData.get("font") ?? "");
  const colorRaw = String(formData.get("color") ?? "").trim();

  const font = fontRaw === "default" || !fontRaw ? null : (fontRaw as ThemeFont);
  if (font && !ALLOWED_FONTS.includes(font)) {
    return { font: null, color: null, error: "Geçersiz font seçimi." };
  }

  const color = colorRaw === "" || colorRaw === "default" ? null : colorRaw;
  if (color && !isValidThemeColor(color)) {
    return { font: null, color: null, error: "Geçersiz renk kodu." };
  }

  return { font, color, error: null };
}

export async function updateOrgTheme(formData: FormData): Promise<ActionResult> {
  const orgId = String(formData.get("orgId") ?? "");
  const { font, color, error } = parseThemeInput(formData);
  if (error) return { error };

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
  const { error: updateError } = await admin
    .from("organizations")
    .update({ theme_font: font, theme_color: color })
    .eq("id", orgId);
  if (updateError) return { error: "Tema kaydedilemedi." };

  revalidatePath("/", "layout");
  return { error: null };
}

export async function updateUserTheme(formData: FormData): Promise<ActionResult> {
  const { font, color, error } = parseThemeInput(formData);
  if (error) return { error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const { error: upsertError } = await supabase.from("user_preferences").upsert({
    user_id: user.id,
    theme_font: font,
    theme_color: color,
    updated_at: new Date().toISOString(),
  });
  if (upsertError) return { error: "Tema kaydedilemedi." };

  revalidatePath("/", "layout");
  return { error: null };
}
