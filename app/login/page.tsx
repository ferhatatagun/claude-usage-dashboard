"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

/**
 * `/auth/callback` başarısız bir giriş denemesini bu sayfaya `?hata=` ile
 * geri gönderir. Kullanıcı aksi hâlde sebebini göremeden giriş ekranına
 * düşerdi.
 */
const CALLBACK_ERRORS: Record<string, string> = {
  expired:
    "Bağlantının süresi dolmuş veya daha önce kullanılmış. Yeni bir bağlantı isteyin.",
  invalid:
    "Bağlantı doğrulanamadı. Aynı tarayıcıdan açtığınızdan emin olup tekrar deneyin.",
  missing: "Giriş bağlantısı eksik görünüyor. Yeni bir bağlantı isteyin.",
};

function CallbackError() {
  const reason = useSearchParams().get("hata");
  const message = reason ? CALLBACK_ERRORS[reason] : null;
  if (!message) return null;
  return (
    <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {message}
    </p>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-6 -ml-2 text-muted-foreground"
        >
          <Link href="/">
            <ArrowLeft />
            Ana sayfa
          </Link>
        </Button>

        <Suspense fallback={null}>
          <CallbackError />
        </Suspense>

        <Card>
          {status === "sent" ? (
            <CardContent className="flex flex-col items-center gap-4 py-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-accent text-primary">
                <MailCheck className="size-5" />
              </span>
              <div className="flex flex-col gap-1.5">
                <p className="font-medium">Bağlantı gönderildi</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  <span className="text-foreground">{email}</span> adresine bir
                  giriş bağlantısı yolladık. Gelen kutunuzu kontrol edin.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatus("idle")}
              >
                Farklı adres dene
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="font-heading text-2xl tracking-tight">
                  Giriş yap
                </CardTitle>
                <CardDescription>
                  E-posta adresinizi girin, size şifresiz bir giriş bağlantısı
                  gönderelim.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email">
                      E-posta
                      <InfoTooltip text="Şifre gerekmez. E-postanıza bir giriş bağlantısı yollarız, ona tıklamanız yeterli — bağlantı tek kullanımlıktır ve kısa süre sonra geçersiz olur." />
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="isim@sirket.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button type="submit" disabled={status === "sending"}>
                    {status === "sending"
                      ? "Gönderiliyor..."
                      : "Giriş bağlantısı gönder"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginForm />;
}
