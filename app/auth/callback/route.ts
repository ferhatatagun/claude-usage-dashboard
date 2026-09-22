import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";

/**
 * Yalnızca uygulama içi, tek eğik çizgiyle başlayan yollara izin veririz.
 * `//baska-site.com` ve `https://...` gibi değerler açık yönlendirme açığıdır;
 * bunlar `next` parametresine dışarıdan yazılabilir.
 */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));

  // Supabase hata durumunda kodu değil, hata alanlarını döner.
  const authError = searchParams.get("error_description") ?? searchParams.get("error");
  const code = searchParams.get("code");

  // Yönlendirmede isteğin kendi kökünü değil yapılandırılmış adresi
  // kullanırız; vekil arkasında `request.url` iç adresi taşıyabilir.
  const base = siteUrl();

  if (!authError && code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  const reason = authError
    ? "expired"
    : code
      ? "invalid"
      : "missing";
  return NextResponse.redirect(`${base}/login?hata=${reason}`);
}
