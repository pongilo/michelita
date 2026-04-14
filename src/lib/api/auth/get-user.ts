import { createServerFn } from "@tanstack/react-start";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const getUserServerFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  return data;
});

export async function getUser() {
  return getUserServerFn();
}
