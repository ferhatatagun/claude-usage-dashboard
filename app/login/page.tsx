"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
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
                    <Label htmlFor="email">E-posta</Label>
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
