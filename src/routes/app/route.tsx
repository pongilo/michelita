import { createFileRoute, Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { MenuIcon, PackageIcon, PlusIcon, ListOrderedIcon, UsersRoundIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: PrivateLayout,
});

const navItems = [
  { to: "/app/orders", icon: ListOrderedIcon, label: "Pedidos" },
  { to: "/app/customers", icon: UsersRoundIcon, label: "Clientes" },
  { to: "/app/products", icon: PackageIcon, label: "Produtos" },
] as const;

function NavLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  return (
    <>
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: true }}
          onClick={onNavigate}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-muted data-[status=active]:text-foreground",
            className
          )}
        >
          <item.icon className="size-4" />
          <span>{item.label}</span>
        </Link>
      ))}
    </>
  );
}

function AppBar({ orgName }: { orgName: string }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background px-4 py-3 md:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => setIsMobileNavOpen(true)}
      >
        <MenuIcon className="size-5" />
        <span className="sr-only">Abrir menu</span>
      </Button>

      <nav className="hidden items-center gap-1 md:flex">
        <NavLinks />
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

      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <SheetContent side="left" className="w-3/4">
          <SheetHeader>
            <SheetTitle>{orgName}</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4">
            <NavLinks onNavigate={() => setIsMobileNavOpen(false)} />
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}

function PrivateLayout() {
  const { user, organization, isLoading } = useAuth();
  const { location } = useRouterState();
  const hideAppBar = location.pathname === "/app/orders/form";

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!organization) return <Navigate to="/organization/new" />;

  return (
    <div className="flex min-h-svh flex-col">
      {!hideAppBar && <AppBar orgName={organization.name} />}
      <Outlet />
    </div>
  );
}
