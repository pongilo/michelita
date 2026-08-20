import { createFileRoute, Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { PackageIcon, ListOrderedIcon, PlusIcon, UserRoundIcon, UsersRoundIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: PrivateLayout,
});

const navItems = [
  { to: "/app/orders", icon: ListOrderedIcon, label: "Pedidos" },
  { to: "/app/customers", icon: UsersRoundIcon, label: "Clientes" },
  { to: "/app/products", icon: PackageIcon, label: "Produtos" },
] as const;

const bottomTabItems = [
  ...navItems,
  { to: "/app/account", icon: UserRoundIcon, label: "Conta" },
] as const;

function AppBar({ orgName }: { orgName: string }) {
  return (
    <header className="sticky top-0 z-40 hidden items-center gap-2 border-b bg-background px-4 py-3 md:flex md:px-6">
      <nav className="flex items-center gap-1">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: true }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-muted data-[status=active]:text-foreground"
          >
            <item.icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Link to="/app/orders/form" className={buttonVariants({ variant: "default" })}>
          <PlusIcon className="size-4" />
          Novo
        </Link>

        <Link
          to="/app/account"
          className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 transition-colors hover:bg-muted data-[status=active]:bg-muted"
        >
          <div className="flex aspect-square size-7 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
            {orgName.charAt(0).toUpperCase()}
          </div>
          <span className="hidden text-sm font-medium sm:inline">{orgName}</span>
        </Link>
      </div>
    </header>
  );
}

function BottomTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      {bottomTabItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: true }}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground data-[status=active]:text-foreground"
        >
          <item.icon className="size-5" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function PrivateLayout() {
  const { user, organization, isLoading } = useAuth();
  const { location } = useRouterState();
  const hideChrome = location.pathname === "/app/orders/form";

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!organization) return <Navigate to="/organization/new" />;

  return (
    <div className="flex min-h-svh flex-col">
      {!hideChrome && <AppBar orgName={organization.name} />}
      <div className={cn("flex-1", !hideChrome && "pb-16 md:pb-0")}>
        <Outlet />
      </div>
      {!hideChrome && <BottomTabBar />}
    </div>
  );
}
