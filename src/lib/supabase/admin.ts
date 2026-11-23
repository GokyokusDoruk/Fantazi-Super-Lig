import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service role istemcisi: RLS'i aşar, yalnızca sunucuda ve scriptlerde kullanılır.
 * Bu anahtar asla tarayıcıya giden koda girmemeli.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL yok (.env)");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY yok (.env)");
  return createClient(url, key, { auth: { persistSession: false } });
}
