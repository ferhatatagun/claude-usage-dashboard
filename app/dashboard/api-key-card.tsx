"use client";

import { useRef, useState, useTransition } from "react";
import { KeyRound, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { revokeApiKey, saveApiKey } from "@/lib/actions/api-keys";
import { syncUsage } from "@/lib/actions/usage-sync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type ApiKeyRow = {
  id: string;
  key_preview: string;
  created_at: string;
  last_used_at: string | null;
};

const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Istanbul",
});

function formatDate(value: string | null) {
  if (!value) return "hiç";
  return dateFormat.format(new Date(value));
}

function SecurityNote() {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3.5">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          Anahtarınız nasıl korunuyor?
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-4">
          <li>
            Anahtar veritabanına düz metin olarak yazılmaz. Supabase Vault ile
            şifrelenir; şifreleme anahtarı veritabanının dışında tutulur.
          </li>
          <li>
            Tabloda sadece anahtarın baştaki tanıtıcı kısmı, son 4 hanesi ve
            şifreli kaydın kimliği durur. Anahtarın kendisi hiçbir zaman
            tarayıcıya geri gönderilmez.
          </li>
          <li>
            Çözme yetkisi yalnızca sunucu tarafındaki gizli anahtara verilmiştir.
            Tarayıcıdan gelen istekler bu fonksiyonları çağıramaz.
          </li>
          <li>
            Her organizasyon yalnızca kendi anahtarını görür; satır bazlı güvenlik
            (RLS) bunu veritabanı seviyesinde zorunlu kılar.
          </li>
          <li>
            Sildiğinizde şifreli kayıt da kasadan tamamen silinir; geri
            döndürülemez.
          </li>
        </ul>
        <p>
          Anahtarı istediğiniz an Anthropic Console üzerinden de iptal
          edebilirsiniz. Biz yalnızca kullanım ve maliyet raporlarını okuruz,
          konuşma içeriğine erişmeyiz.
        </p>
      </div>
    </div>
  );
}

export function ApiKeyCard({
  orgId,
  keys,
}: {
  orgId: string;
  keys: ApiKeyRow[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const activeKey = keys[0] ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4 text-primary" />
          Anthropic Admin API anahtarı
        </CardTitle>
        <CardDescription>
          Ekibinizin token kullanımını ve maliyetini çekebilmemiz için
          Anthropic Console&apos;dan aldığınız Admin API anahtarını bağlayın.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {activeKey ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border px-4 py-3.5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm">
                  {activeKey.key_preview}
                </span>
                <Badge variant="secondary">Bağlı</Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(activeKey.created_at)} tarihinde eklendi · Son
                kullanım: {formatDate(activeKey.last_used_at)}
              </span>
            </div>
            <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={isSyncing}
              onClick={() => {
                setIsSyncing(true);
                startTransition(async () => {
                  const result = await syncUsage(orgId);
                  setIsSyncing(false);
                  if (result.error) toast.error(result.error);
                  else if (result.days === 0)
                    toast.info("Anthropic bu dönem için kayıt döndürmedi.");
                  else
                    toast.success(`${result.days} günlük veri güncellendi.`);
                });
              }}
            >
              <RefreshCw />
              {isSyncing ? "Çekiliyor..." : "Veriyi yenile"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={revokingId === activeKey.id}
              onClick={() => {
                setRevokingId(activeKey.id);
                startTransition(async () => {
                  const result = await revokeApiKey(activeKey.id);
                  setRevokingId(null);
                  if (result.error) toast.error(result.error);
                  else toast.success("Anahtar silindi.");
                });
              }}
            >
              <Trash2 />
              {revokingId === activeKey.id ? "Siliniyor..." : "Sil"}
            </Button>
            </div>
          </div>
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                const result = await saveApiKey(formData);
                if (result.error) {
                  setError(result.error);
                } else {
                  toast.success(
                    result.organizationName
                      ? `${result.organizationName} organizasyonuna bağlanıldı.`
                      : "Anahtar doğrulandı ve kaydedildi."
                  );
                  formRef.current?.reset();
                }
              });
            }}
            className="flex flex-col gap-3"
          >
            <input type="hidden" name="orgId" value={orgId} />

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-64 flex-1 flex-col gap-2">
                <Label htmlFor="api-key">Admin API anahtarı</Label>
                <Input
                  id="api-key"
                  name="secret"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  placeholder="sk-ant-admin..."
                  className="font-mono"
                />
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Doğrulanıyor..." : "Anahtarı bağla"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Anahtarı Anthropic Console → Settings → Admin keys altından
              oluşturabilirsiniz. Kaydetmeden önce Anthropic&apos;e sorup
              çalıştığını doğruluyoruz.
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        )}

        <SecurityNote />
      </CardContent>
    </Card>
  );
}
