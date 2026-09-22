import { Users2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type UsageRecordRow = {
  user_email: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  usage_date: string;
};

const tokenFormat = new Intl.NumberFormat("tr-TR");
const moneyFormat = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "USD",
});
const dayFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Listede gösterilen en fazla kişi sayısı. */
const TOP_N = 25;

/**
 * Kişi bazında kullanım. Bu kırılım yalnızca CSV'den gelir; Anthropic'in
 * kullanım ucu kişi kimliği döndürmez.
 */
export function MemberUsage({ records }: { records: UsageRecordRow[] }) {
  if (records.length === 0) return null;

  const byEmail = new Map<
    string,
    { tokens: number; cost: number; models: Set<string> }
  >();

  for (const row of records) {
    const entry = byEmail.get(row.user_email) ?? {
      tokens: 0,
      cost: 0,
      models: new Set<string>(),
    };
    entry.tokens += row.input_tokens + row.output_tokens;
    entry.cost += Number(row.cost_usd);
    if (row.model) entry.models.add(row.model);
    byEmail.set(row.user_email, entry);
  }

  const people = [...byEmail.entries()].sort(
    (a, b) => b[1].cost - a[1].cost || b[1].tokens - a[1].tokens
  );

  const days = [...new Set(records.map((r) => r.usage_date))].sort();
  const totalCost = people.reduce((sum, [, entry]) => sum + entry.cost, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users2 className="size-4 text-primary" />
          Kişi bazında kullanım
        </CardTitle>
        <CardDescription>
          CSV&apos;den gelen {tokenFormat.format(byEmail.size)} kişi
          {days.length > 0 &&
            ` · ${dayFormat.format(new Date(days[0]))} – ${dayFormat.format(new Date(days[days.length - 1]))}`}
          {totalCost > 0 && ` · toplam ${moneyFormat.format(totalCost)}`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kişi</TableHead>
              <TableHead className="text-right">Token</TableHead>
              <TableHead className="text-right">Maliyet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.slice(0, TOP_N).map(([email, entry]) => (
              <TableRow key={email}>
                <TableCell className="font-medium">{email}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {tokenFormat.format(entry.tokens)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {moneyFormat.format(entry.cost)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {people.length > TOP_N && (
          <p className="pt-4 text-xs text-muted-foreground">
            En çok harcayan {TOP_N} kişi gösteriliyor; toplam{" "}
            {tokenFormat.format(people.length)} kişi var.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
