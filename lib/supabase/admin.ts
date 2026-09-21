import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Gizli anahtarlı istemci — RLS'i bypass eder. Sadece Server Action'lardan,
// route handler'lardan veya cron job'lardan çağrılmalı. Client Component'ten asla.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SECRET_KEY .env.local içinde tanımlı olmalı. " +
        "Anahtarları https://supabase.com/dashboard/project/_/settings/api-keys adresinden alın."
    );
  }

  return createSupabaseClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
