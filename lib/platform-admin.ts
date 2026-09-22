import { createClient } from "@/lib/supabase/server";

/**
 * Oturumdaki kullanıcı platform sahibi mi?
 *
 * Kararı veritabanındaki `is_platform_admin()` fonksiyonu verir; liste
 * uygulamada değil veritabanında tutulur, böylece aynı sınır hem arayüzde
 * hem RLS politikalarında geçerli olur. Kullanıcıya bağlı istemciyle
 * çağırırız — yönetici istemcisiyle çağırmak herkesi platform sahibi
 * gösterirdi.
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) return false;
  return data === true;
}
