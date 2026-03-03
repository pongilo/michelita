import { createFileRoute, redirect } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { getSupabaseClient } from "@/lib/supabase";

export const Route = createFileRoute("/_private/dashboard")({
  beforeLoad: async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw redirect({ to: "/login" });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      await navigate({ to: "/login" });
      return;
    }

    await supabase.auth.signOut();
    await navigate({ to: "/login" });
  }

  return (
    <main className="max-w-7xl mx-auto px-5 py-20">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-white text-4xl">Dashboard</h1>
        <button
          type="button"
          onClick={handleSignOut}
          className="px-5 py-3 rounded-full font-body font-bold text-michelita-purple bg-michelita-yellow hover:bg-michelita-yellow/80 duration-150"
        >
          Sair
        </button>
      </div>
    </main>
  );
}
