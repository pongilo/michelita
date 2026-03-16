import { createServerFn } from "@tanstack/react-start";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const getUserServerFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  const authSessionMissing =
    !!error && error.message.toLowerCase().includes("auth session missing");

  if (error && !authSessionMissing) {
    throw new Error(error.message);
  }

  return {
    user: data.user
      ? {
          id: data.user.id,
          email: data.user.email ?? null,
        }
      : null,
  };
});

export async function getUser() {
  return getUserServerFn();
}
