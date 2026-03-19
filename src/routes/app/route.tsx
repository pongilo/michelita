import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/api/auth/sign-out";
import { getSession } from "@/lib/api/auth/get-session";
import { getOrganization } from "@/lib/api/organization/get-organization";

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
    <div className="min-h-screen bg-base-200">
      <header className="sticky top-0 z-20 border-b border-base-300 bg-base-100/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-70">Organizacao</p>
            <p className="font-semibold">{organization.name}</p>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <Link
              to="/app/dashboard"
              activeOptions={{ exact: true }}
              activeProps={{ className: "btn btn-sm btn-primary" }}
              className="btn btn-sm btn-ghost"
            >
              Dashboard
            </Link>
            <Link
              to="/app/orders"
              activeOptions={{ exact: true }}
              activeProps={{ className: "btn btn-sm btn-primary" }}
              className="btn btn-sm btn-ghost"
            >
              Pedidos
            </Link>
            <Link
              to="/app/encomendas-do-dia"
              activeOptions={{ exact: true }}
              activeProps={{ className: "btn btn-sm btn-primary" }}
              className="btn btn-sm btn-ghost"
            >
              Entregas
            </Link>
            <Link
              to="/app/customers"
              activeOptions={{ exact: true }}
              activeProps={{ className: "btn btn-sm btn-primary" }}
              className="btn btn-sm btn-ghost"
            >
              Clientes
            </Link>
            <Link
              to="/app/transactions"
              activeOptions={{ exact: true }}
              activeProps={{ className: "btn btn-sm btn-primary" }}
              className="btn btn-sm btn-ghost"
            >
              Transacoes
            </Link>
            <Link
              to="/app/order/form"
              activeOptions={{ exact: true }}
              activeProps={{ className: "btn btn-sm btn-primary" }}
              className="btn btn-sm btn-ghost"
            >
              Novo pedido
            </Link>
          </nav>

          <button type="button" onClick={handleSignOut} className="btn btn-sm btn-outline">
            Sair
          </button>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
