import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { getSession } from "@/lib/api/auth/get-session";
import { signOut } from "@/lib/api/auth/sign-out";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const { session } = await getSession()

    if (!session) {
      throw redirect({ to: "/login" });
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
            <Link to="/app/order">Pedidos</Link>
          </li>
          <li>
            <Link to="/app/customer">Clientes</Link>
          </li>
          <li>
            <Link to="/app/product">Produtos</Link>
          </li>
          <li>
            <button type="button" onClick={handleSignOut}>Sair</button>
          </li>
        </ul>
      </div>
    </div>
  )
}
