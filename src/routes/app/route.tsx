import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/api/auth/sign-out";
import { getUser } from "@/lib/api/auth/get-user";
import { getOrganization } from "@/lib/api/organization/get-organization";
import { ArrowRightLeftIcon, ChevronsUpDown, GalleryVerticalEnd, HouseIcon, ListOrderedIcon, LogOutIcon, SettingsIcon, User2Icon, UsersRoundIcon } from 'lucide-react'
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
  { to: "/app/order/form", icon: HouseIcon, label: "Novo pedido" },
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

}
