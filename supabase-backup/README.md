# Supabase yedeği — claude-usage-dashboard

Proje: `vfxdhcduskaozvwoejgj` (eu-central-1, Postgres 17) · Yedek tarihi: 2026-10-25

| Dosya | İçerik |
|---|---|
| `schema.sql` | Tablolar, index'ler, RLS policy'leri, fonksiyonlar (10 migration birleşimi) |
| `data.sql` | `organizations`, `organization_members`, `platform_admins`, `user_preferences` satırları |
| `auth-users.json` | `auth.users` / `auth.identities` kaydı (şifre hash'i çıkarıldı) |
| `email-templates/` | Auth mail şablonları |

Boş olan tablolar: `organization_invites`, `api_keys`, `usage_records`, `usage_daily`, `cost_daily`. Vault, Storage ve Edge Function yok.

## Geri yükleme
1. Yeni Supabase projesi aç.
2. `auth-users.json` kullanıcısını aynı UUID ile Auth Admin API'den oluştur (`data.sql` bu UUID'ye bağlı).
3. `schema.sql`, ardından `data.sql` çalıştır.
4. Auth ayarları (Site URL, redirect, SMTP) ve Vercel env değişkenleri bu yedekte **yok**; `.env.example`'a bak.
