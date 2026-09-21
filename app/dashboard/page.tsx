import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, plan_type)")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>

      {!membership ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          Henüz bir organizasyona bağlı değilsiniz. Organizasyon oluşturma ve
          davet akışı yakında.
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          Kullanım verisi henüz yok. Admin API anahtarınızı bağlayın veya CSV
          yükleyin.
        </div>
      )}
    </div>
  );
}
