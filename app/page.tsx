import Link from "next/link";
import {
  ArrowRight,
  FileSpreadsheet,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: RefreshCw,
    title: "Enterprise: Otomatik senkron",
    body: "Claude Enterprise Admin API anahtarınızı bağlayın, kullanım verileri günlük olarak otomatik çekilsin.",
  },
  {
    icon: FileSpreadsheet,
    title: "Team: CSV yükleme",
    body: "Claude.ai'dan indirdiğiniz kullanım raporunu yükleyin, dashboard aynı şekilde çalışsın.",
  },
  {
    icon: Users,
    title: "Kişi ve model bazında kırılım",
    body: "Kim, hangi modeli, ne zaman ne kadar kullanmış — haftalık ve günlük görünüm.",
  },
];

const securityPoints = [
  {
    strong: "Anahtarınız asla düz metin saklanmaz.",
    rest: "Supabase Vault ile şifrelenir; veritabanında yalnızca şifreli kayda işaret eden bir referans tutulur.",
  },
  {
    strong: "Anahtar yalnızca bir kez görünür.",
    rest: "Ekledikten sonra arayüzde sadece son 4 karakteri gösterilir.",
  },
  {
    strong: "İstediğiniz an iptal edebilirsiniz.",
    rest: "Tek tıkla anahtarı devre dışı bırakır, erişimi anında kesersiniz.",
  },
  {
    strong: "Kapsamı dar anahtar önerilir.",
    rest: "Mümkünse yalnızca Usage/Cost okuma yetkisi olan bir anahtar kullanın.",
  },
  {
    strong: "Organizasyonlar birbirinden izole.",
    rest: "Row-Level Security ile bir organizasyonun verisi başka bir organizasyondan görünmez.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-heading text-xl tracking-tight">
            Claude Usage Dashboard
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Giriş yap</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-28 px-6 py-20">
        <section className="flex flex-col items-start gap-7">
          <Badge variant="secondary" className="gap-1.5 rounded-full">
            <KeyRound className="size-3.5" />
            Kendi API anahtarınızla çalışır
          </Badge>
          <h1 className="font-heading max-w-3xl text-5xl leading-[1.08] tracking-tight sm:text-6xl">
            Ekibinizin Claude kullanımını tek bakışta görün
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            Hangi model ne kadar token harcıyor, haftalık ve günlük trendler
            neler — ekibinizin Claude harcamasını şeffaf bir panelde takip edin.
          </p>
          <Button asChild size="lg" className="group rounded-full">
            <Link href="/login">
              Ücretsiz başla
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </section>

        <section className="grid gap-5 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <Card
              key={title}
              className="transition-colors hover:border-primary/40"
            >
              <CardContent className="flex flex-col gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-4.5" />
                </span>
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section id="security" className="flex flex-col gap-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="font-heading text-3xl tracking-tight">Güvenlik</h2>
          </div>
          <p className="max-w-2xl text-muted-foreground">
            Bu ürün sizin adınıza üçüncü taraf bir API anahtarı tutuyor. Bunu
            nasıl koruduğumuzu açıkça yazıyoruz.
          </p>
          <Card>
            <CardContent>
              <ul className="flex flex-col divide-y divide-border">
                {securityPoints.map(({ strong, rest }) => (
                  <li
                    key={strong}
                    className="py-3.5 text-sm leading-6 first:pt-0 last:pb-0"
                  >
                    <strong className="font-medium text-foreground">
                      {strong}
                    </strong>{" "}
                    <span className="text-muted-foreground">{rest}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto w-full max-w-5xl px-6 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Claude Usage Dashboard · Anthropic ile
          bağlantılı değildir.
        </div>
      </footer>
    </div>
  );
}
