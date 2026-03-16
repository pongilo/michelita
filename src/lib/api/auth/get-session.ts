import { createServerFn } from "@tanstack/react-start";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const getSessionServerFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  const authSessionMissing =
    !!error && error.message.toLowerCase().includes("auth session missing");

  if (error && !authSessionMissing) {
    throw new Error(error.message);
  }

  return {
    session: data.user
      ? {
          user: {
            id: data.user.id,
            email: data.user.email ?? null,
          },
        }
      : null,
  };
});

export async function getSession() {
  return getSessionServerFn();
}
