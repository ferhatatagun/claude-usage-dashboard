"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, Download, FileUp, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { importUsageCsv } from "@/lib/actions/usage-csv";
import {
  MAX_CSV_BYTES,
  aggregateRows,
  parseUsageCsv,
  type ParsedUsageRow,
  type RowIssue,
} from "@/lib/usage/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Preview = {
  file: File;
  rows: ParsedUsageRow[];
  issues: RowIssue[];
  skipped: number;
};

const numberFormat = new Intl.NumberFormat("tr-TR");
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-heading text-lg tracking-tight">{value}</span>
    </div>
  );
}

export function CsvUploadCard({ orgId }: { orgId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onFileChange(file: File | undefined) {
    setError(null);
    setPreview(null);
    if (!file) return;

    if (file.size > MAX_CSV_BYTES) {
      setError(
        `Dosya çok büyük. En fazla ${Math.round(MAX_CSV_BYTES / 1024 / 1024)} MB yükleyebilirsiniz.`
      );
      return;
    }

    // Önizleme tamamen tarayıcıda yapılır; onaylanana kadar dosya sunucuya
    // gitmez. Kaydetme adımında sunucu dosyayı yeniden okuyup doğrular.
    const parsed = parseUsageCsv(await file.text());
    if (!parsed.ok) {
      setError(parsed.reason);
      return;
    }

    setPreview({
      file,
      rows: aggregateRows(parsed.rows),
      issues: parsed.issues,
      skipped: parsed.skipped,
    });
  }

  function onConfirm() {
    if (!preview) return;
    const formData = new FormData();
    formData.set("orgId", orgId);
    formData.set("file", preview.file);

    startTransition(async () => {
      const result = await importUsageCsv(formData);
      if (result.error !== null) {
        setError(result.error);
        return;
      }
      toast.success(
        `${numberFormat.format(result.imported)} kayıt yüklendi.` +
          (result.skipped > 0
            ? ` ${numberFormat.format(result.skipped)} satır atlandı.`
            : "")
      );
      reset();
    });
  }

  const totals = preview
    ? preview.rows.reduce(
        (acc, row) => {
          acc.input += row.inputTokens;
          acc.output += row.outputTokens;
          acc.cost += row.costUsd;
          return acc;
        },
        { input: 0, output: 0, cost: 0 }
      )
    : null;

  const days = preview ? preview.rows.map((r) => r.usageDate).sort() : [];
  const people = preview
    ? new Set(preview.rows.map((r) => r.userEmail)).size
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileUp className="size-4 text-primary" />
          CSV ile kullanım yükle
        </CardTitle>
        <CardDescription>
          Admin API anahtarı olmayan Team planları için. Anthropic
          Console&apos;dan indirdiğiniz kullanım dosyasını yükleyin; kişi
          bazında kullanım buradan gelir.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <a
          href="/templates/kullanim-sablonu.csv"
          download
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          <Download className="size-3.5" />
          Örnek şablonu indir
        </a>

        <div className="flex flex-col gap-2">
          <Label htmlFor="usage-csv">
            CSV dosyası
            <InfoTooltip text="Yukarıdaki örnek şablonla aynı sütun düzenini kullanın: e-posta, tarih, model, girdi/çıktı token ve maliyet. Sütun sırası ve büyük/küçük harf önemli değil." />
          </Label>
          <Input
            ref={inputRef}
            id="usage-csv"
            type="file"
            accept=".csv,text/csv,text/plain"
            disabled={isPending}
            onChange={(event) => void onFileChange(event.target.files?.[0])}
          />
          <p className="text-xs text-muted-foreground">
            Zorunlu sütunlar: e-posta ve tarih. Ayrıca girdi token, çıktı token
            veya maliyet sütunlarından en az biri bulunmalı. Türkçe başlıklar,
            noktalı virgülle ayrılmış dosyalar ve GG.AA.YYYY tarihleri
            desteklenir.
          </p>
        </div>

        {error && (
          <div className="flex gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {preview && totals && (
          <div className="flex flex-col gap-5 rounded-lg border border-border px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{preview.file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {days.length > 0 &&
                    `${dayFormat.format(new Date(days[0]))} – ${dayFormat.format(new Date(days[days.length - 1]))} · `}
                  {numberFormat.format(people)} kişi
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={isPending}
                onClick={reset}
              >
                <X />
                Vazgeç
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Stat
                label="Satır"
                value={numberFormat.format(preview.rows.length)}
              />
              <Stat
                label="Girdi token"
                value={numberFormat.format(totals.input)}
              />
              <Stat
                label="Çıktı token"
                value={numberFormat.format(totals.output)}
              />
              <Stat label="Maliyet" value={moneyFormat.format(totals.cost)} />
            </div>

            {preview.skipped > 0 && (
              <div className="flex flex-col gap-2 rounded-lg bg-muted/50 px-3.5 py-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {numberFormat.format(preview.skipped)} satır atlanacak
                </span>
                <ul className="flex list-disc flex-col gap-0.5 pl-4">
                  {preview.issues.map((issue) => (
                    <li key={issue.line}>
                      Satır {issue.line}: {issue.reason}
                    </li>
                  ))}
                </ul>
                {preview.skipped > preview.issues.length && (
                  <span>
                    …ve {numberFormat.format(preview.skipped - preview.issues.length)}{" "}
                    satır daha.
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button onClick={onConfirm} disabled={isPending}>
                <Upload />
                {isPending ? "Yükleniyor..." : "Kaydet"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Aynı kişi, gün ve model için var olan kayıtlar güncellenir;
                yinelenen satır oluşmaz.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
