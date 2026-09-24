"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FONT_OPTIONS, COLOR_PRESETS, isValidThemeColor } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ThemeForm({
  action,
  initialFont,
  initialColor,
  resetLabel,
}: {
  action: (formData: FormData) => Promise<{ error: string | null }>;
  initialFont: string | null;
  initialColor: string | null;
  resetLabel: string;
}) {
  const [font, setFont] = useState(initialFont ?? "default");
  const [color, setColor] = useState(initialColor ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(nextFont: string, nextColor: string | null) {
    setError(null);
    const formData = new FormData();
    formData.set("font", nextFont);
    formData.set("color", nextColor ?? "default");
    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Tema kaydedildi.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="theme-font">
          Yazı tipi
          <InfoTooltip text="Arayüzde kullanılacak yazı tipi. Kişisel bir seçim yaparsanız organizasyon temasını ezer; sadece sizin tarayıcınızda geçerli olur." />
        </Label>
        <Select
          value={font}
          onValueChange={(value) => {
            setFont(value);
            submit(value, color || null);
          }}
        >
          <SelectTrigger id="theme-font" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">{resetLabel}</SelectItem>
            {FONT_OPTIONS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>
          Vurgu rengi
          <InfoTooltip text="Butonlar, bağlantılar ve grafiklerde kullanılan ana renk. Hazır paletten seçebilir veya sağdaki renk seçiciyle kendi tonunuzu belirleyebilirsiniz." />
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              title={preset.label}
              onClick={() => {
                setColor(preset.value);
                submit(font, preset.value);
              }}
              className="size-8 rounded-full border border-border transition-transform hover:scale-110 data-[active=true]:ring-2 data-[active=true]:ring-offset-2 data-[active=true]:ring-ring"
              data-active={color.toLowerCase() === preset.value.toLowerCase()}
              style={{ backgroundColor: preset.value }}
            />
          ))}

          <input
            type="color"
            aria-label="Özel renk seç"
            value={isValidThemeColor(color) ? color : "#d97757"}
            onChange={(e) => setColor(e.target.value)}
            onBlur={() => {
              if (isValidThemeColor(color)) submit(font, color);
            }}
            className="size-8 cursor-pointer rounded-full border border-border bg-transparent p-0"
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setColor("");
              submit(font, null);
            }}
          >
            {resetLabel}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
