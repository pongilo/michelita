import { createFileRoute, Link, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { PackageIcon, UsersRoundIcon, PlusIcon, ListOrderedIcon } from 'lucide-react'
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
  useSidebar,
} from "@/components/ui/sidebar"


export const Route = createFileRoute("/app")({
  component: PrivateLayout,
});

const navItems = [
  { to: "/app/orders/form", icon: PlusIcon, label: "Novo" },
  { to: "/app/orders", icon: ListOrderedIcon, label: "Pedidos" },
  { to: "/app/customers", icon: UsersRoundIcon, label: "Clientes" },
  { to: "/app/products", icon: PackageIcon, label: "Produtos" },
] as const;

function AppSidebar({ orgName }: { orgName: string }) {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link to="/app/account" onClick={() => setOpenMobile(false)} />
              }
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {orgName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">{orgName}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton render={
                  <Link
                    to={item.to}
                    activeOptions={{ exact: true }}
                    className="font-medium"
                    onClick={() => setOpenMobile(false)}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                }>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function PrivateLayout() {
  const { user, organization, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!organization) return <Navigate to="/organization/new" />;

  return (
    <SidebarProvider>
      <AppSidebar orgName={organization.name} />
      <SidebarInset>
        <div className="flex justify-between items-center p-5 max-md:hidden">
          <SidebarTrigger />
        </div>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )

}
