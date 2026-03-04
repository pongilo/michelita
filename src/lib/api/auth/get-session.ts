import { supabase } from "@/lib/supabase";

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message)
  }

  return data
}