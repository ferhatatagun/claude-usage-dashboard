export type ThemeFont = "geist" | "inter" | "ibm-plex" | "system";

export const FONT_OPTIONS: { value: ThemeFont; label: string; cssVar: string }[] = [
  { value: "geist", label: "Geist (varsayılan)", cssVar: "var(--font-geist-sans)" },
  { value: "inter", label: "Inter", cssVar: "var(--font-inter)" },
  { value: "ibm-plex", label: "IBM Plex Sans", cssVar: "var(--font-ibm-plex)" },
  {
    value: "system",
    label: "Sistem fontu",
    cssVar:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
];

export const DEFAULT_PRIMARY_COLOR = "oklch(0.672 0.131 41.5)";

export const COLOR_PRESETS: { value: string; label: string }[] = [
  { value: "#d97757", label: "Turuncu" },
  { value: "#3b82f6", label: "Mavi" },
  { value: "#22c55e", label: "Yeşil" },
  { value: "#a855f7", label: "Mor" },
  { value: "#ef4444", label: "Kırmızı" },
  { value: "#57534e", label: "Nötr gri" },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidThemeColor(value: string): boolean {
  return HEX_RE.test(value);
}

export function fontCssVar(font: ThemeFont | null | undefined): string | null {
  const option = FONT_OPTIONS.find((f) => f.value === font);
  return option ? option.cssVar : null;
}

export type EffectiveTheme = {
  fontVar: string | null;
  color: string | null;
};

/**
 * Kullanıcı tercihi varsa organizasyon varsayılanını ezer; ikisi de yoksa
 * uygulamanın kendi varsayılanı (Geist + turuncu) kullanılır.
 */
export function resolveTheme(
  org: { theme_font: string | null; theme_color: string | null } | null | undefined,
  user: { theme_font: string | null; theme_color: string | null } | null | undefined
): EffectiveTheme {
  const font = (user?.theme_font ?? org?.theme_font ?? null) as ThemeFont | null;
  const color = user?.theme_color ?? org?.theme_color ?? null;
  return { fontVar: fontCssVar(font), color };
}
