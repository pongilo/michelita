import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/api/auth/sign-out";
import { getUser } from "@/lib/api/auth/get-user";
import { getOrganization } from "@/lib/api/organization/get-organization";
import { ArrowRightLeftIcon, HouseIcon, KanbanIcon, ListOrderedIcon, PanelRightCloseIcon, PlusIcon, UsersRoundIcon } from 'lucide-react'

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
      <div className="drawer-content">
        <nav className="navbar w-full bg-white sticky top-0 z-10">
          <label htmlFor="app-drawer" aria-label="open sidebar" className="btn btn-square btn-ghost lg:hidden">
            <PanelRightCloseIcon className="size-5" />
          </label>
          <div className="px-4 flex justify-end w-full">
            <button
              type="button"
              className="btn btn-soft btn-neutral"
              onClick={handleSignOut}
            >
              Sair
            </button>
          </div>
        </nav>
        <div className="bg-base-200 border-t border-l border-base-300 rounded-tl-box h-full">
          <Outlet />
        </div>
      </div>

      <div className="drawer-side is-drawer-close:overflow-visible">
        <label htmlFor="app-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
        <div className="bg-white min-h-full w-80">
          <div className="font-semibold text-lg px-7 py-5">
            {organization.name}
          </div>
          <ul className="menu p-4 w-full space-y-1">
            <li>
              <Link
              to="/app/order/form"
              className="btn btn-soft btn-primary"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary" }}
            >
              <PlusIcon className="size-4" />
              <span>Novo pedido</span>
            </Link>
            </li>
            <li>
              <Link
                to="/app/overview"
                activeOptions={{ exact: true }}
                activeProps={{ className: "text-primary" }}
              >
                <HouseIcon className="size-5" />
                <span>Visão geral</span>
              </Link>
            </li>

            <li>
              <Link
                to="/app/orders"
                activeOptions={{ exact: true }}
                activeProps={{ className: "text-primary" }}
              >
                <ListOrderedIcon className="size-5" />
                <span>Pedidos</span>
              </Link>
            </li>

            <li>
              <Link
                to="/app/deliveries"
                activeOptions={{ exact: true }}
                activeProps={{ className: "text-primary" }}
              >
                <KanbanIcon className="size-5" />
                <span>Entregas</span>
              </Link>
            </li>

            <li>
              <Link
                to="/app/customers"
                activeOptions={{ exact: true }}
                activeProps={{ className: "text-primary" }}
              >
                <UsersRoundIcon className="size-5" />
                <span>Clientes</span>
              </Link>
            </li>

            <li>
              <Link
                to="/app/transactions"
                activeOptions={{ exact: true }}
                activeProps={{ className: "text-primary" }}
              >
                <ArrowRightLeftIcon className="size-5" />
                <span>Transações</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
