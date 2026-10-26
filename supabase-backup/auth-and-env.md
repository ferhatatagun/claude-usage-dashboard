# Auth ayarları ve ortam değişkenleri

Bu dosyada **hiçbir gizli değer yok** (repo public). Yalnızca ad, yapı ve nerede ayarlandığı yazılı.

## Ortam değişkenleri (kaynak: `.env.example`, `lib/`, `vercel.json`)

| Değişken | Tür | Not |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | açık | `https://<proje-ref>.supabase.co`; yeni projede değişir |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | açık | `sb_publishable_...`; yeni projeden alınır |
| `SUPABASE_SECRET_KEY` | **gizli** | `sb_secret_...`; yeni projeden alınır, eski değer işe yaramaz |
| `NEXT_PUBLIC_SITE_URL` | açık | Davet/giriş bağlantılarının döneceği üretim adresi (`lib/site-url.ts`) |
| `CRON_SECRET` | **gizli** | `openssl rand -hex 32` ile yeniden üretilebilir. Tanımsızsa cron ucu kapalı |

Anthropic Admin API anahtarları env'de değil, Supabase Vault'ta tutuluyordu. Vault boştu, taşınacak anahtar yok.

## Vercel
- Proje: `claude-usage-dashboard` (`prj_iEiMHTfB3fp1yvxv0M6NtzzF9ue9`), kişisel hesap kapsamı `ferhatatagun2gmailcoms-projects`
- Yayın adresi: `https://claude-usage-dashboard-six.vercel.app` (tek alan adı, özel domain yok; doğrulanmış)
- Tanımlı env değişkenleri (2026-10-26, yalnızca ad ve hedef; değerler okunmadı):

| Değişken | production | preview | development |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✓ | ✓ | |
| `SUPABASE_SECRET_KEY` (sensitive) | ✓ | ✓ | |
| `NEXT_PUBLIC_SITE_URL` | ✓ | ✓ | |
| `CRON_SECRET` | ✓ (sensitive) | ✓ (sensitive) | ✓ |

- Cron (`vercel.json`): `GET /api/cron/sync-usage`, her gün `0 6 * * *` (UTC), `Authorization: Bearer $CRON_SECRET`

## Supabase Auth (dashboard'dan elle alınacak)
Kodun beklediği yapı:
- **Site URL**: üretim adresi (`NEXT_PUBLIC_SITE_URL` ile aynı)
- **Redirect URLs**: üretim ve yerel adres için `/auth/callback` (ör. `https://<alan-adı>/auth/callback`, `http://localhost:3000/auth/callback`)
- **Sağlayıcı**: yalnızca Email (kullanıcının `raw_app_meta_data.providers = ["email"]`)
- **Mail şablonları**: `email-templates/` içinde, konu satırları için `email-templates` altındaki orijinal `README.md`'ye bak (`supabase/templates/dist/README.md`)
- **SMTP**: canlı projedeki değer okunamadı (aşağıya bak)

Dashboard yolu: Authentication → URL Configuration / Sign In-Providers / Emails (Templates, SMTP Settings).

### Canlıdan okunamayan, elle doldurulacaklar
- [ ] Site URL (büyük ihtimalle `https://claude-usage-dashboard-six.vercel.app`, doğrulanmadı): ______
- [ ] Redirect URLs listesi: ______
- [ ] Özel SMTP kullanılıyor mu? (host, port, kullanıcı, gönderen adı/adresi. **Şifreyi buraya yazma**): ______
- [ ] "Confirm email" açık mı: ______
- [ ] Rate limit / OTP süresi varsayılandan farklı mı: ______
