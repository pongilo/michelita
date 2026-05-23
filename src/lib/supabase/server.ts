import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";

export function createSupabaseServerClient() {
  return createServerClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          const cookies = getCookies();

          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            setCookie(name, value, options);
          }
        },
      },
    }
  );
}
