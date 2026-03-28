import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/api/auth/sign-out";
import { getUser } from "@/lib/api/auth/get-user";
import { getOrganization } from "@/lib/api/organization/get-organization";
import { ArrowRightLeftIcon, ChevronDownIcon, ChevronsUpDown, GalleryVerticalEnd, HouseIcon, ListOrderedIcon, LogOutIcon, MenuIcon, PlusIcon, SettingsIcon, User2Icon, UsersRoundIcon } from 'lucide-react'
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

const navItems = [
  { to: "/app/overview", icon: HouseIcon, label: "Página inicial" },
  { to: "/app/orders", icon: ListOrderedIcon, label: "Pedidos" },
  { to: "/app/customers", icon: UsersRoundIcon, label: "Clientes" },
  { to: "/app/transactions", icon: ArrowRightLeftIcon, label: "Transações" },
] as const;

function PrivateLayout() {
  const navigate = useNavigate();
  const { organization, user } = Route.useRouteContext();

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/login" });
  }


  return (
    <SidebarProvider>
      <Sidebar variant="floating">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    />
                  }
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <GalleryVerticalEnd className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium">{organization.name}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--anchor-width)"
                  align="start"
                >
                  <DropdownMenuItem render={
                    <Link to="/app/settings">
                      <SettingsIcon className="size-4" />
                      <span>Configurações</span>
                    </Link>
                  }/>
                  <DropdownMenuItem render={
                    <Link to="/app/account">
                      <User2Icon className="size-4" />
                      <span>{user.user_metadata.name}</span>
                    </Link>
                  }/>
                  <DropdownMenuItem render={
                    <button type="button" onClick={handleSignOut} className="w-full">
                      <LogOutIcon className="size-4 shrink-0" />
                      <span>Sair</span>
                    </button>
                  }/>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton render={
                      <Link
                        to={item.to}
                        activeOptions={{ exact: true }}
                        className="font-medium"
                      >
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    }>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )

  return (
    <div className="drawer lg:drawer-open">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col min-h-screen">
        <nav className="navbar w-full bg-base-100 border-b border-base-200 sticky top-0 z-10 lg:hidden">
          <label htmlFor="app-drawer" aria-label="open sidebar" className="btn btn-square btn-ghost">
            <MenuIcon className="size-5" />
          </label>
          <span className="font-semibold text-sm ml-1">{organization.name}</span>
        </nav>
        <div className="flex-1 bg-base-100">
          <Outlet />
        </div>
      </div>

      <div className="drawer-side z-20 border-r border-base-300">
        <label htmlFor="app-drawer" aria-label="close sidebar" className="drawer-overlay"></label>

        <aside className="min-h-full w-64 bg-base-100">

          <div className="px-3 py-2">
            <div className="dropdown w-full">
              <div tabIndex={0} role="button" className="btn btn-ghost gap-2.5 px-2 py-5 w-full">
                <div className="size-7 rounded-md bg-primary flex items-center justify-center text-base-100 text-xs font-bold shrink-0">
                  {organization.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-sm truncate flex-1 text-left">{organization.name}</span>
                <ChevronDownIcon className="size-4 shrink-0" />
              </div>
              <div
                tabIndex={0}
                className="dropdown-content card card-sm bg-base-100 z-1 w-58 shadow-md border border-base-300"
              >
                <ul className="menu w-full space-y-0.5">
                  <li>
                    <Link
                      to="/app/settings"
                      activeOptions={{ exact: true }}
                      className="opacity-60!"
                    >
                      <SettingsIcon className="size-4" />
                      <span>Configurações</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/app/account"
                      activeOptions={{ exact: true }}
                      className="opacity-60!"
                    >
                      <User2Icon className="size-4" />
                      <span>{user.user_metadata.name}</span>
                    </Link>
                  </li>
                  <li>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleSignOut}
                      className="w-full justify-start opacity-60!"
                    >
                      <LogOutIcon className="size-4 shrink-0" />
                      <span>Sair</span>
                    </Button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="px-3 pt-4 pb-2">
            <Link
              to="/app/order/form"
              className="btn btn-primary w-full btn-soft"
            >
              <PlusIcon className="size-4 shrink-0" />
              <span>Novo pedido</span>
            </Link>
          </div>

          <ul className="menu w-full px-3 py-2 space-y-0.5">
            {navItems.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  activeOptions={{ exact: true }}
                  className="opacity-60!"
                  activeProps={{ className: "text-primary opacity-100!" }}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
