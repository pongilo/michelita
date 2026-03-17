import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/api/auth/sign-out";
import { getOrganization } from "@/lib/api/organization/get-organization";
import { getSession } from "@/lib/api/auth/get-session";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const { session } = await getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    const organization = await getOrganization({ ownerId: session.user.id });

    if (!organization) {
      throw redirect({ to: "/organization/new" });
    }

    return {
      user: session.user,
      organization
    }
  },
  component: PrivateLayout,
});

function PrivateLayout() {
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/login" });
  }

  return (
    <div>
      <Outlet />
      <button type="button" onClick={handleSignOut}>Sair</button>
    </div>
  )

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
          <li>
            <Link to="/app/dashboard">Dashboard</Link>
          </li>
          <li>
            <button type="button" onClick={handleSignOut}>Sair</button>
          </li>
        </ul>
      </div>
    </div>
  )
}
