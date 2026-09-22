# Supabase e-posta şablonları

Bu klasördeki dosyalar `node supabase/templates/build.mjs` ile üretilir.
Elle düzenlemeyin; kaynak `../build.mjs` dosyasıdır.

Kurulum: Supabase Dashboard → Authentication → Emails → Templates.
Her sekme için konu satırını yazın, gövdeye ilgili HTML dosyasının tamamını
yapıştırın ve kaydedin.

| Dashboard sekmesi | Subject heading | Dosya |
| --- | --- | --- |
| Confirm signup | E-posta adresinizi doğrulayın | `confirm-signup.html` |
| Magic Link | Giriş bağlantınız | `magic-link.html` |
| Invite user | Bir ekibe davet edildiniz | `invite.html` |
| Reset Password | Şifrenizi sıfırlayın | `reset-password.html` |
| Change Email Address | E-posta değişikliğini onaylayın | `change-email.html` |
| Reauthentication | Doğrulama kodunuz | `reauthentication.html` |

Şablonlar Go değişkenleri kullanır (`{{ .ConfirmationURL }}`, `{{ .Email }}`,
`{{ .Token }}`). Supabase bunları gönderim anında doldurur.

Bağlantıların doğru adrese dönmesi için aynı ekranda
Authentication → URL Configuration altında Site URL üretim adresiniz olmalı ve
Redirect URLs listesinde hem üretim hem yerel adres bulunmalıdır.
