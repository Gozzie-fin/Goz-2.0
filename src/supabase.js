import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function loadFromSupabase(userId) {
  const { data, error } = await supabase
    .from("user_data")
    .select("data")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data.data;
}

export async function saveToSupabase(userId, appData) {
  await supabase
    .from("user_data")
    .upsert({ user_id: userId, data: appData, updated_at: new Date().toISOString() });
}
