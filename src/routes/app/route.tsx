import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/api/auth/sign-out";
import { getUser } from "@/lib/api/auth/get-user";
import { getOrganization } from "@/lib/api/organization/get-organization";
import { ArrowRightLeftIcon, ChevronsUpDown, ListCheckIcon, LogOutIcon, SettingsIcon, User2Icon, UsersRoundIcon } from 'lucide-react'
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
  shouldReload: false,
  beforeLoad: async ({ location }) => {
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
      pathname: location.pathname,
    };
  },
  component: PrivateLayout,
});

const navItems = [
  { to: "/app/orders", icon: ListCheckIcon, label: "Pedidos" },
  { to: "/app/customers", icon: UsersRoundIcon, label: "Clientes" },
  { to: "/app/transactions", icon: ArrowRightLeftIcon, label: "Transações" },
] as const;

function PrivateLayout() {
  const navigate = useNavigate();
  const { organization, user, pathname } = Route.useRouteContext();

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/login" });
  }

  return (
    <SidebarProvider>
      <Sidebar>
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
                    {organization.name.charAt(0).toUpperCase()}
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
        <div className="flex justify-between items-center p-5">
          <SidebarTrigger />
          {pathname !== "/app/orders/form" && (
            <Button size="sm" nativeButton={false} render={<Link to="/app/orders/form" />}>
              Novo pedido
            </Button>
          )}
        </div>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )

}
