import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Inter, IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";
import { resolveTheme } from "@/lib/theme";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

const displaySerif = Instrument_Serif({
  variable: "--font-display-serif",
  weight: "400",
  subsets: ["latin", "latin-ext"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex",
  weight: ["400", "500", "600"],
  subsets: ["latin", "latin-ext"],
});

const description =
  "Ekibinizin Claude token kullanımını ve maliyetini kişi ve model bazında, haftalık ve günlük olarak takip edin.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Claude Team Usage",
    template: "%s · Claude Team Usage",
  },
  description,
  keywords: [
    "Claude kullanım takibi",
    "Claude maliyet takibi",
    "Anthropic Claude dashboard",
    "Claude Enterprise usage",
    "takım Claude kullanımı",
  ],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Claude Team Usage",
    title: "Claude Team Usage",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Team Usage",
    description,
  },
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Etkin temayı sunucuda çözer: kullanıcı tercihi varsa organizasyon
 * varsayılanını ezer, ikisi de yoksa uygulama varsayılanı (Geist +
 * turuncu) kullanılır. Oturum yoksa (ör. /login) varsayılana düşer.
 */
async function getEffectiveTheme() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return resolveTheme(null, null);

  const [{ data: membership }, { data: preferences }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("organizations(theme_font, theme_color)")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select("theme_font, theme_color")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const org = membership
    ? Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations
    : null;

  return resolveTheme(org ?? null, preferences ?? null);
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getEffectiveTheme();

  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} ${displaySerif.variable} ${inter.variable} ${ibmPlexSans.variable} h-full antialiased`}
      style={
        {
          ...(theme.fontVar ? { "--font-sans": theme.fontVar } : {}),
          ...(theme.color
            ? {
                "--primary": theme.color,
                "--ring": theme.color,
                "--sidebar-primary": theme.color,
                "--sidebar-ring": theme.color,
                "--chart-1": theme.color,
              }
            : {}),
        } as React.CSSProperties
      }
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
