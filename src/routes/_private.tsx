import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSupabaseClient } from "@/lib/supabase";

export const Route = createFileRoute("/_private")({
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
  component: PrivateLayout,
});

function PrivateLayout() {
  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer-3" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        <label htmlFor="my-drawer-3" className="btn drawer-button lg:hidden">
          Open drawer
        </label>
        <Outlet />
      </div>
      <div className="drawer-side">
        <label htmlFor="my-drawer-3" aria-label="close sidebar" className="drawer-overlay"></label>
        <ul className="menu bg-base-200 min-h-full w-80 p-4">
          <li><a>Sidebar Item 1</a></li>
          <li><a>Sidebar Item 2</a></li>
        </ul>
      </div>
    </div>
  )
}
