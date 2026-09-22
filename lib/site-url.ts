/**
 * Uygulamanın dışarıya açık kök adresi. Davet ve giriş bağlantıları bu adrese
 * döner; Supabase yalnızca izin listesindeki adreslere yönlendirir, bu yüzden
 * burada üretilen adresin Supabase → Authentication → URL Configuration
 * altındaki Redirect URLs listesiyle birebir uyuşması gerekir.
 *
 * Sondaki eğik çizgi temizlenir; aksi hâlde `${siteUrl()}/auth/callback`
 * çift eğik çizgiyle üretilir ve izin listesine takılır.
 */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return raw.replace(/\/+$/, "");
}

/**
 * Giriş sonrası dönülecek mutlak adres. Oturumu kuran tek yer
 * `/auth/callback`; Supabase'in ürettiği tek kullanımlık kod orada oturuma
 * çevrilir. Bağlantıyı doğrudan `/dashboard`'a yollarsak kod hiç
 * kullanılmadan düşer ve kullanıcı giriş ekranına geri atılır.
 */
export function callbackUrl(next = "/dashboard"): string {
  return `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}
