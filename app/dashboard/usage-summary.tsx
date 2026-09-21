import { BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type UsageDailyRow = {
  usage_date: string;
  model: string;
  uncached_input_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  output_tokens: number;
};

export type CostDailyRow = {
  usage_date: string;
  amount_cents: number;
};

const tokenFormat = new Intl.NumberFormat("tr-TR");
const moneyFormat = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "USD",
});
const dayFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-heading text-2xl tracking-tight">{value}</span>
    </div>
  );
}

export function UsageSummary({
  usage,
  cost,
}: {
  usage: UsageDailyRow[];
  cost: CostDailyRow[];
}) {
  if (usage.length === 0 && cost.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Kullanım verisi henüz yok. Admin API anahtarınızı bağlayıp
          &quot;Veriyi yenile&quot; deyin veya CSV yükleyin.
        </CardContent>
      </Card>
    );
  }

  const inputTokens = usage.reduce(
    (sum, r) =>
      sum +
      r.uncached_input_tokens +
      r.cache_read_input_tokens +
      r.cache_creation_input_tokens,
    0
  );
  const outputTokens = usage.reduce((sum, r) => sum + r.output_tokens, 0);
  // Anthropic tutarı cent cinsinden verir; dolara çevirmek için 100'e böleriz.
  const totalUsd = cost.reduce((sum, r) => sum + Number(r.amount_cents), 0) / 100;

  // Model kırılımı — en çok token harcayan modeller önce.
  const byModel = new Map<string, number>();
  for (const r of usage) {
    const total =
      r.uncached_input_tokens +
      r.cache_read_input_tokens +
      r.cache_creation_input_tokens +
      r.output_tokens;
    byModel.set(r.model || "bilinmiyor", (byModel.get(r.model || "bilinmiyor") ?? 0) + total);
  }
  const models = [...byModel.entries()].sort((a, b) => b[1] - a[1]);
  const topModelTokens = models[0]?.[1] ?? 1;

  const days = [...new Set(usage.map((r) => r.usage_date))].sort();
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4 text-primary" />
          Son 31 gün
        </CardTitle>
        {firstDay && lastDay && (
          <CardDescription>
            {dayFormat.format(new Date(firstDay))} –{" "}
            {dayFormat.format(new Date(lastDay))}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-7">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <Stat label="Girdi token" value={tokenFormat.format(inputTokens)} />
          <Stat label="Çıktı token" value={tokenFormat.format(outputTokens)} />
          <Stat label="Maliyet" value={moneyFormat.format(totalUsd)} />
        </div>

        {models.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Modele göre dağılım
            </h3>
            {models.map(([model, tokens]) => (
              <div key={model} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="font-mono text-xs">{model}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {tokenFormat.format(tokens)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(tokens / topModelTokens) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
