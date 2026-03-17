import { createServerFn } from "@tanstack/react-start";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const getUserServerFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return data;
});

export async function getUser() {
  return getUserServerFn();
}
