import { createServerFn } from "@tanstack/react-start";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const getSessionServerFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data;
});

export async function getSession() {
  return getSessionServerFn();
}
