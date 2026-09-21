import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateOrgForm } from "./create-org-form";
import { InviteForm } from "./invite-form";
import { AcceptInviteButton, RevokeInviteButton } from "./invite-actions";

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

  if (!membership) {
    const { data: pendingInvites } = await supabase
      .from("organization_invites")
      .select("id, role, organizations(name)")
      .eq("email", user.email!.toLowerCase())
      .eq("status", "pending");

    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>

        {pendingInvites && pendingInvites.length > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Bekleyen davetleriniz
            </h2>
            {pendingInvites.map((invite) => {
              const org = Array.isArray(invite.organizations)
                ? invite.organizations[0]
                : invite.organizations;
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {org?.name ?? "Organizasyon"} — {invite.role === "admin" ? "Admin" : "Üye"} olarak davet edildiniz
                  </span>
                  <AcceptInviteButton inviteId={invite.id} />
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Yeni organizasyon oluştur
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Henüz bir organizasyona bağlı değilsiniz. Kendi organizasyonunuzu
              oluşturarak başlayabilir veya bir davet bekleyebilirsiniz.
            </p>
          </div>
          <CreateOrgForm />
        </div>
      </div>
    );
  }

  const org = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;
  const isAdmin = membership.role === "admin";

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("organization_members")
    .select("id, user_id, role, created_at")
    .eq("org_id", org!.id)
    .order("created_at", { ascending: true });

  const memberEmails = new Map<string, string>();
  if (members) {
    await Promise.all(
      members.map(async (m) => {
        const { data } = await admin.auth.admin.getUserById(m.user_id);
        if (data.user?.email) memberEmails.set(m.user_id, data.user.email);
      })
    );
  }

  const { data: invites } = isAdmin
    ? await admin
        .from("organization_invites")
        .select("id, email, role, status")
        .eq("org_id", org!.id)
        .eq("status", "pending")
    : { data: null };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {org?.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Plan: {org?.plan_type === "enterprise" ? "Enterprise" : "Team"} · Rolünüz:{" "}
          {isAdmin ? "Admin" : "Üye"}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        Kullanım verisi henüz yok. Admin API anahtarınızı bağlayın veya CSV
        yükleyin.
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Ekip üyeleri
        </h2>
        <div className="flex flex-col gap-2">
          {members?.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-800"
            >
              <span className="text-zinc-700 dark:text-zinc-300">
                {memberEmails.get(m.user_id) ?? m.user_id}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-500">
                {m.role === "admin" ? "Admin" : "Üye"}
              </span>
            </div>
          ))}
        </div>

        {isAdmin && (
          <>
            {invites && invites.length > 0 && (
              <div className="flex flex-col gap-2 pt-2">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-500">
                  Bekleyen davetler
                </h3>
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-lg border border-dashed border-zinc-300 px-4 py-2.5 text-sm dark:border-zinc-700"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {invite.email}{" "}
                      <span className="text-xs text-zinc-500">
                        ({invite.role === "admin" ? "Admin" : "Üye"})
                      </span>
                    </span>
                    <RevokeInviteButton inviteId={invite.id} />
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <h3 className="mb-3 text-xs font-semibold text-zinc-500 dark:text-zinc-500">
                Yeni üye davet et
              </h3>
              <InviteForm orgId={org!.id} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
