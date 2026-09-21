/**
 * Supabase Auth e-posta şablonlarını tek bir kabuktan üretir.
 *
 * Çalıştır:  node supabase/templates/build.mjs
 * Çıktı:     supabase/templates/dist/*.html
 *
 * Üretilen dosyaların içeriğini Supabase Dashboard →
 * Authentication → Emails → Templates altındaki ilgili sekmeye yapıştırın.
 *
 * Go template değişkenleri ({{ .ConfirmationURL }} gibi) olduğu gibi korunur.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "dist");

// --- Tasarım token'ları (app/globals.css ile aynı his) ---------------------
const c = {
  page: "#faf9f7", // sıcak kırık beyaz zemin
  card: "#ffffff",
  border: "#e8e3dc",
  heading: "#1c1917",
  body: "#57534e",
  muted: "#8b857c",
  primary: "#d97757", // mercan
  primaryText: "#ffffff",
};

const serif = "Georgia, 'Times New Roman', Times, serif";
const sans =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const BRAND = "Claude Usage Dashboard";

/** E-posta istemcilerinde güvenli, tablo tabanlı kabuk. */
function layout({ preheader, heading, intro, cta, outro, footnote }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${heading}</title>
</head>
<body style="margin:0; padding:0; width:100%; background-color:${c.page}; font-family:${sans}; -webkit-font-smoothing:antialiased;">

<div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">${preheader}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.page};">
  <tr>
    <td align="center" style="padding:40px 16px;">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px; width:100%;">

        <!-- Marka -->
        <tr>
          <td style="padding:0 4px 20px 4px;">
            <span style="font-family:${serif}; font-size:19px; color:${c.heading}; letter-spacing:-0.2px;">${BRAND}</span>
          </td>
        </tr>

        <!-- Kart -->
        <tr>
          <td style="background-color:${c.card}; border:1px solid ${c.border}; border-radius:14px; padding:36px 32px;">

            <h1 style="margin:0 0 14px 0; font-family:${serif}; font-size:26px; line-height:1.25; font-weight:400; color:${c.heading}; letter-spacing:-0.3px;">${heading}</h1>

            <p style="margin:0 0 26px 0; font-size:15px; line-height:1.65; color:${c.body};">${intro}</p>

            ${cta}

            ${
              outro
                ? `<p style="margin:26px 0 0 0; font-size:14px; line-height:1.65; color:${c.muted};">${outro}</p>`
                : ""
            }

          </td>
        </tr>

        <!-- Alt bilgi -->
        <tr>
          <td style="padding:22px 4px 0 4px;">
            <p style="margin:0 0 6px 0; font-size:12px; line-height:1.6; color:${c.muted};">${footnote}</p>
            <p style="margin:0; font-size:12px; line-height:1.6; color:${c.muted};">${BRAND} &middot; Anthropic ile bağlantılı değildir.</p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
`;
}

/** Mercan renkli, yuvarlak buton + kopyalanabilir yedek bağlantı. */
function button(label, href = "{{ .ConfirmationURL }}") {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="${c.primary}" style="border-radius:999px;">
                  <a href="${href}" target="_blank" style="display:inline-block; padding:13px 30px; font-family:${sans}; font-size:15px; font-weight:600; line-height:1; color:${c.primaryText}; text-decoration:none; border-radius:999px;">${label}</a>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0 0; font-size:12px; line-height:1.6; color:${c.muted};">
              Buton çalışmazsa bu adresi tarayıcınıza yapıştırın:<br />
              <span style="font-family:${mono}; font-size:11px; color:${c.body}; word-break:break-all;">${href}</span>
            </p>`;
}

/** 6 haneli doğrulama kodu bloğu. */
function codeBlock() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="center" style="background-color:${c.page}; border:1px solid ${c.border}; border-radius:10px; padding:20px 16px;">
                  <span style="font-family:${mono}; font-size:30px; font-weight:600; letter-spacing:7px; color:${c.heading};">{{ .Token }}</span>
                </td>
              </tr>
            </table>`;
}

const EXPIRY = "Bu bağlantı güvenliğiniz için kısa süre sonra geçersiz olur.";
const NOT_YOU = "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.";

// --- Şablonlar -------------------------------------------------------------
const templates = {
  "confirm-signup": {
    tab: "Confirm signup",
    preheader: `${BRAND} hesabınızı doğrulayın.`,
    heading: "E-posta adresinizi doğrulayın",
    intro: `<strong style="color:${c.heading};">{{ .Email }}</strong> adresiyle ${BRAND} hesabı oluşturuldu. Kaydı tamamlamak için adresinizi doğrulayın.`,
    cta: button("E-posta adresimi doğrula"),
    outro: NOT_YOU,
    footnote: EXPIRY,
  },

  "magic-link": {
    tab: "Magic Link",
    preheader: `${BRAND} giriş bağlantınız.`,
    heading: "Giriş bağlantınız hazır",
    intro: `<strong style="color:${c.heading};">{{ .Email }}</strong> için giriş bağlantısı istendi. Şifre gerekmez — aşağıdaki butona dokunmanız yeterli.`,
    cta: button("Giriş yap"),
    outro: `${NOT_YOU} Hesabınız güvende kalır.`,
    footnote: `Bu bağlantı yalnızca bir kez ve kısa süre için kullanılabilir.`,
  },

  invite: {
    tab: "Invite user",
    preheader: `${BRAND} üzerinde bir ekibe davet edildiniz.`,
    heading: "Ekibe davet edildiniz",
    intro: `<strong style="color:${c.heading};">{{ .Email }}</strong> adresi ${BRAND} üzerinde bir ekibe davet edildi. Daveti kabul ederek ekibin Claude token kullanımını gün gün görebilirsiniz.`,
    cta: button("Daveti kabul et"),
    outro: `Bu daveti beklemiyorduysanız bu e-postayı yok sayabilirsiniz; hiçbir hesap oluşturulmaz.`,
    footnote: EXPIRY,
  },

  "reset-password": {
    tab: "Reset Password",
    preheader: `${BRAND} şifre sıfırlama isteği.`,
    heading: "Şifrenizi sıfırlayın",
    intro: `<strong style="color:${c.heading};">{{ .Email }}</strong> için şifre sıfırlama isteği aldık. Yeni bir şifre belirlemek için devam edin.`,
    cta: button("Yeni şifre belirle"),
    outro: `${NOT_YOU} Mevcut şifreniz değişmeden kalır.`,
    footnote: EXPIRY,
  },

  "change-email": {
    tab: "Change Email Address",
    preheader: `${BRAND} e-posta değişikliğini onaylayın.`,
    heading: "E-posta değişikliğini onaylayın",
    intro: `Hesabınızın e-posta adresi <strong style="color:${c.heading};">{{ .Email }}</strong> adresinden <strong style="color:${c.heading};">{{ .NewEmail }}</strong> adresine taşınmak isteniyor. Onaylamak için devam edin.`,
    cta: button("Değişikliği onayla"),
    outro: `${NOT_YOU} Adresiniz değişmeden kalır.`,
    footnote: EXPIRY,
  },

  reauthentication: {
    tab: "Reauthentication",
    preheader: `${BRAND} doğrulama kodunuz.`,
    heading: "Doğrulama kodunuz",
    intro: `İşleme devam etmek için aşağıdaki kodu uygulamaya girin.`,
    cta: codeBlock(),
    outro: NOT_YOU,
    footnote: "Kod kısa süre sonra geçersiz olur. Kimseyle paylaşmayın.",
  },
};

// --- Üretim ----------------------------------------------------------------
mkdirSync(outDir, { recursive: true });

for (const [name, t] of Object.entries(templates)) {
  writeFileSync(join(outDir, `${name}.html`), layout(t), "utf8");
  console.log(`${name}.html  →  Dashboard sekmesi: "${t.tab}"`);
}

console.log(`\n${Object.keys(templates).length} şablon üretildi: ${outDir}`);
