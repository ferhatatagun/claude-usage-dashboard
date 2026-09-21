import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service_role client — bypasses RLS. Only ever import this from API routes,
// route handlers, or cron jobs. Never from a Server/Client Component.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
