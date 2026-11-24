import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Yayınlanabilir anahtarla okuyan istemci. Yalnızca oyun verisini okur;
 * RLS kuralları bu veriyi herkese açık tuttuğu için oturum gerekmez.
 *
 * Gizli anahtar (service role) burada kullanılmaz — bkz. admin.ts.
 */
export function createPublicClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL yok (.env)");
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY yok (.env)");
  return createClient(url, key, { auth: { persistSession: false } });
}
