import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-6">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">
          Claude Usage Dashboard
        </span>
        <Link
          href="/login"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Giriş yap
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-24 px-6 py-16">
        <section className="flex flex-col gap-6">
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
            Ekibinizin Claude kullanımını tek bakışta görün
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Hangi model ne kadar token harcıyor, haftalık ve günlük trendler
            neler — ekibinizin Claude harcamasını şeffaf bir dashboard&apos;da
            takip edin.
          </p>
          <div>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-6 text-base font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Ücretsiz başla
            </Link>
          </div>
        </section>

        <section className="grid gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Enterprise: Otomatik senkron
            </h3>
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Claude Enterprise Admin API anahtarınızı bağlayın, kullanım
              verileri günlük olarak otomatik çekilsin.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Team: CSV yükleme
            </h3>
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Claude.ai&apos;dan indirdiğiniz kullanım raporunu yükleyin,
              dashboard aynı şekilde çalışsın.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Kişi ve model bazında kırılım
            </h3>
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Kim, hangi modeli, ne zaman ne kadar kullanmış — haftalık ve
              günlük görünüm.
            </p>
          </div>
        </section>

        <section
          id="security"
          className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Güvenlik
          </h2>
          <ul className="flex flex-col gap-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            <li>
              • Anthropic API anahtarınız veritabanında{" "}
              <strong className="text-zinc-900 dark:text-zinc-50">
                asla düz metin olarak saklanmaz
              </strong>{" "}
              — Supabase Vault ile şifrelenmiş olarak tutulur.
            </li>
            <li>
              • Anahtarınızı arayüzden bir daha göremezsiniz, sadece son 4
              karakteri gösterilir.
            </li>
            <li>
              • İstediğiniz an anahtarınızı iptal edebilir (revoke), tüm
              erişimi anında kesebilirsiniz.
            </li>
            <li>
              • Mümkünse sadece Usage/Cost okuma yetkisine sahip, kapsamı
              daraltılmış bir anahtar kullanmanızı öneririz.
            </li>
            <li>
              • Her organizasyon verisi Row-Level Security ile izole edilir —
              başka bir organizasyonun verisine erişilemez.
            </li>
          </ul>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-4xl px-6 py-8 text-sm text-zinc-500 dark:text-zinc-500">
        © {new Date().getFullYear()} Claude Usage Dashboard
      </footer>
    </div>
  );
}
