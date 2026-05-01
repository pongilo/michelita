import { createFileRoute, Link, Navigate, Outlet, useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/api/auth/sign-out";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, LogOutIcon, PackageIcon, SettingsIcon, User2Icon, UsersRoundIcon, ListOrderedIcon, PlusIcon, DollarSignIcon, CalendarIcon } from 'lucide-react'
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
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


export const Route = createFileRoute("/app")({
  component: PrivateLayout,
});

const navItems = [
  {
    label: 'Pedidos',
    links: [
      { to: "/app/orders/form", icon: PlusIcon, label: "Novo" },
      { to: "/app/orders", icon: CalendarIcon, label: "Agenda" },
      { to: "/app/history", icon: ListOrderedIcon, label: "Histórico" },
    ]
  },
  {
    label: 'Mais',
    links: [
      { to: "/app/finance", icon: DollarSignIcon, label: "Financeiro" },
      { to: "/app/customers", icon: UsersRoundIcon, label: "Clientes" },
      { to: "/app/products", icon: PackageIcon, label: "Produtos" },
    ]
  }
] as const;

function AppSidebar({ orgName, userName, onSignOut }: { orgName: string; userName: string; onSignOut: () => void }) {
  const { setOpenMobile } = useSidebar();

  return (
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
                  {orgName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">{orgName}</span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--anchor-width)"
                align="start"
              >
                <DropdownMenuItem render={
                  <Link to="/app/settings" onClick={() => setOpenMobile(false)}>
                    <SettingsIcon className="size-4" />
                    <span>Configurações</span>
                  </Link>
                }/>
                <DropdownMenuItem render={
                  <Link to="/app/account" onClick={() => setOpenMobile(false)}>
                    <User2Icon className="size-4" />
                    <span>{userName}</span>
                  </Link>
                }/>
                <DropdownMenuItem render={
                  <button type="button" onClick={onSignOut} className="w-full">
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
        {navItems.map((item, itemIndex) => (
          <SidebarGroup key={`group-${itemIndex}`}>
            {item.label && <SidebarGroupLabel>{item.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              {item.links.map((link) => (
                <SidebarMenuItem key={link.to}>
                  <SidebarMenuButton render={
                    <Link
                      to={link.to}
                      activeOptions={{ exact: true }}
                      className="font-medium"
                      onClick={() => setOpenMobile(false)}
                    >
                      <link.icon className="size-4" />
                      <span>{link.label}</span>
                    </Link>
                  }>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

function PrivateLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, organization, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!organization) return <Navigate to="/organization/new" />;

  async function handleSignOut() {
    await signOut();
    queryClient.setQueryData(["auth-user"], { user: null });
    queryClient.removeQueries({ queryKey: ["organization"] });
    await navigate({ to: "/login" });
  }

  return (
    <SidebarProvider>
      <AppSidebar
        orgName={organization.name}
        userName={user.user_metadata.name}
        onSignOut={handleSignOut}
      />
      <SidebarInset>
        <div className="flex justify-between items-center p-5 max-md:hidden">
          <SidebarTrigger />
        </div>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )

}
