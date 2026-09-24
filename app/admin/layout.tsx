import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LogOut, Settings, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Platform paneline giriş kapısı. Alt sayfaların hiçbiri kendi yetki
 * kontrolünü tekrarlamaz; sınır burada bir kez kurulur ve veritabanı
 * tarafında RLS ile ikinci kez zorunlu kılınır.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!(await isPlatformAdmin())) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin"
              className="font-heading text-xl tracking-tight"
            >
              Platform paneli
            </Link>
            <Badge variant="secondary">Tüm organizasyonlar</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <LayoutDashboard />
                Kendi panelim
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/settings">
                <Settings />
                Ayarlar
              </Link>
            </Button>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                <LogOut />
                Çıkış
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3.5">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm leading-6 text-muted-foreground">
            Bu ekran tüm ekiplerin verisini gösterir: üye adresleri, kişi
            başına token kullanımı ve harcama. Ekipler kendi panellerinde
            birbirinin bu verisini göremez. Yetki yalnızca okumadır; buradan
            hiçbir ekibin ayarı değiştirilemez ve bağlı API anahtarlarının
            kendisi burada da açılamaz.
          </p>
        </div>

        {children}
      </main>
    </div>
  );
}
