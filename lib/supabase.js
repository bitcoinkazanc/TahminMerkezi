import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL ortam değişkeni bulunamadı."
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY ortam değişkeni bulunamadı."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default supabase;