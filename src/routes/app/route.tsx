import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/api/auth/sign-out";
import { getUser } from "@/lib/api/auth/get-user";
import { getOrganization } from "@/lib/api/organization/get-organization";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const { user } = await getUser();

    if (!user) {
      throw redirect({ to: "/login" });
    }

    const organization = await getOrganization({ ownerId: user.id });

    if (!organization) {
      throw redirect({ to: "/organization/new" });
    }

    return {
      user,
      organization,
    };
  },
  component: PrivateLayout,
});

function PrivateLayout() {
  const navigate = useNavigate();
  const { organization } = Route.useRouteContext();

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/login" });
  }

  return (
    <div className="drawer lg:drawer-open">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content min-h-screen bg-base-200">
        <nav className="navbar w-full bg-base-300">
          <label htmlFor="app-drawer" aria-label="open sidebar" className="btn btn-square btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </label>
          <div className="px-4">{organization.name}</div>
        </nav>
        <div className="p-4"><Outlet /></div>
      </div>


      <div className="drawer-side is-drawer-close:overflow-visible">
        <label htmlFor="app-drawer" aria-label="fechar menu lateral" className="drawer-overlay" />

        <aside className="flex min-h-full flex-col border-r border-base-300 bg-base-100 is-drawer-close:w-16 is-drawer-open:w-72">
          <ul className="menu w-full grow gap-1 p-2">
            <li>
              <Link
                to="/app/overview"
                data-tip="Dashboard"
                activeOptions={{ exact: true }}
                activeProps={{ className: "menu-active is-drawer-close:tooltip is-drawer-close:tooltip-right" }}
                className="is-drawer-close:tooltip is-drawer-close:tooltip-right"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 21v-8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v8" />
                </svg>
                <span className="is-drawer-close:hidden">Dashboard</span>
              </Link>
            </li>

            <li>
              <Link
                to="/app/orders"
                data-tip="Pedidos"
                activeOptions={{ exact: true }}
                activeProps={{ className: "menu-active is-drawer-close:tooltip is-drawer-close:tooltip-right" }}
                className="is-drawer-close:tooltip is-drawer-close:tooltip-right"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5h11M9 12h11M9 19h11M5 5h.01M5 12h.01M5 19h.01" />
                </svg>
                <span className="is-drawer-close:hidden">Pedidos</span>
              </Link>
            </li>

            <li>
              <Link
                to="/app/production"
                data-tip="Entregas"
                activeOptions={{ exact: true }}
                activeProps={{ className: "menu-active is-drawer-close:tooltip is-drawer-close:tooltip-right" }}
                className="is-drawer-close:tooltip is-drawer-close:tooltip-right"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01" />
                </svg>
                <span className="is-drawer-close:hidden">Entregas</span>
              </Link>
            </li>

            <li>
              <Link
                to="/app/customers"
                data-tip="Clientes"
                activeOptions={{ exact: true }}
                activeProps={{ className: "menu-active is-drawer-close:tooltip is-drawer-close:tooltip-right" }}
                className="is-drawer-close:tooltip is-drawer-close:tooltip-right"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0zM4 21a8 8 0 0 1 16 0" />
                </svg>
                <span className="is-drawer-close:hidden">Clientes</span>
              </Link>
            </li>

            <li>
              <Link
                to="/app/transactions"
                data-tip="Transacoes"
                activeOptions={{ exact: true }}
                activeProps={{ className: "menu-active is-drawer-close:tooltip is-drawer-close:tooltip-right" }}
                className="is-drawer-close:tooltip is-drawer-close:tooltip-right"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v10H4zM8 11h4M4 9h16" />
                </svg>
                <span className="is-drawer-close:hidden">Transacoes</span>
              </Link>
            </li>

            <li>
              <Link
                to="/app/order/form"
                data-tip="Novo pedido"
                activeOptions={{ exact: true }}
                activeProps={{ className: "menu-active is-drawer-close:tooltip is-drawer-close:tooltip-right" }}
                className="is-drawer-close:tooltip is-drawer-close:tooltip-right"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                </svg>
                <span className="is-drawer-close:hidden">Novo pedido</span>
              </Link>
            </li>
          </ul>

          <div className="border-t border-base-300 p-2">
            <button
              type="button"
              data-tip="Sair"
              onClick={handleSignOut}
              className="btn btn-ghost w-full justify-start is-drawer-close:tooltip is-drawer-close:tooltip-right"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span className="is-drawer-close:hidden">Sair</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
