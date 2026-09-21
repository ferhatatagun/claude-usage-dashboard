# Claude Usage Dashboard

Şirket içi ekipler için Claude/Anthropic token kullanım analiz paneli. Kim hangi modelde ne kadar token harcıyor, günlük/haftalık trendler nasıl — bunu tek panelden takip etmek için yapıldı.

> Durum: Aktif geliştirme aşamasında. Henüz canlıya alınmadı.

## Ne yapar

- **Enterprise planlar için otomatik senkronizasyon** — Anthropic Admin/Analytics API üzerinden kullanım ve maliyet verisi otomatik çekilir.
- **Team planlar için CSV yükleme** — Anthropic'in Team planında tam API erişimi olmadığından, Claude.ai üzerinden alınan kullanım raporları manuel yüklenerek aynı panelde analiz edilir.
- **Kişi/model bazlı kırılım** — Kullanıcı, model ve zaman bazında token/maliyet dağılımı.

## Mimari

- **Next.js 16** (App Router, TypeScript, Tailwind) — hem arayüz hem API route'ları
- **Supabase (Postgres)** — auth, veri saklama, Row-Level Security ile organizasyon bazlı izolasyon
- **Supabase Vault** — Anthropic API anahtarları şifreli saklanır

```
app/
  page.tsx           # Giriş sayfası
  login/              # Magic-link (OTP) girişi
  auth/callback/       # OTP session exchange
  dashboard/           # Auth korumalı panel
lib/supabase/
  client.ts           # Browser client
  server.ts           # Server component client (RLS'e tabi)
  admin.ts            # service_role client (server-only guard'lı)
  middleware.ts        # Session yenileme
```

## Güvenlik

Bu proje, üçüncü taraf API anahtarlarını saklayan bir sistem olduğu için güvenlik tasarımın merkezinde:

- Anthropic API anahtarları hiçbir zaman düz metin (plaintext) olarak saklanmaz — Supabase Vault ile şifrelenir, uygulama tablolarında yalnızca bir referans (`vault_secret_id`) tutulur.
- Anahtar yalnızca eklenirken bir kez gösterilir; sonrasında yalnızca son 4 hanesi görüntülenir.
- Anahtarlar istenildiği an tek tıkla iptal edilebilir (revoke).
- Tüm tablolarda Row-Level Security aktif; bir organizasyonun verisi başka bir organizasyondan asla görünmez.
- `service_role` client'ı `server-only` paketiyle korunur, client tarafına asla sızmaz.

## Geliştirme

```bash
npm install
npm run dev
```

`.env.local` içinde gerekli değişkenler:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Lisans

Henüz belirlenmedi.
