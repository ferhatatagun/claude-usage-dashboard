import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Palette, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateOrgTheme, updateUserTheme } from "@/lib/actions/theme";
import { ThemeForm } from "./theme-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, theme_font, theme_color)")
    .eq("user_id", user.id)
    .maybeSingle();

  const org = membership
    ? Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations
    : null;
  const isAdmin = membership?.role === "admin";

  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("theme_font, theme_color")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-6 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <ArrowLeft />
              Panele dön
            </Link>
          </Button>
          <span className="font-heading text-xl tracking-tight">Ayarlar</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4 text-primary" />
              Kendi görünümüm
            </CardTitle>
            <CardDescription>
              Yalnızca sizin tarayıcınızda geçerli olur; organizasyon
              varsayılanını ezer. &quot;Varsayılanı kullan&quot; ile
              organizasyon temasına geri dönebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeForm
              action={updateUserTheme}
              initialFont={preferences?.theme_font ?? null}
              initialColor={preferences?.theme_color ?? null}
              resetLabel="Varsayılanı kullan"
            />
          </CardContent>
        </Card>

        {org && isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="size-4 text-primary" />
                Organizasyon teması
              </CardTitle>
              <CardDescription>
                {org.name} içindeki tüm üyeler için varsayılan görünüm.
                Kişisel bir tercih belirlemiş üyelerde kendi seçimleri
                geçerli olur.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeForm
                action={async (formData) => {
                  "use server";
                  formData.set("orgId", org.id);
                  return updateOrgTheme(formData);
                }}
                initialFont={org.theme_font}
                initialColor={org.theme_color}
                resetLabel="Uygulama varsayılanı"
              />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
