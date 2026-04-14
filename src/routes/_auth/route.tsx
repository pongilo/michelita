import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, organization, isLoading } = useAuth();
  const { location } = useRouterState();

  if (!isLoading) {
    if (!user) {
      if (location.pathname === "/organization/new") {
        return <Navigate to="/login" />;
      }
    } else if (organization) {
      return <Navigate to="/app/orders" />;
    } else if (location.pathname !== "/organization/new") {
      return <Navigate to="/organization/new" />;
    }
  }

  return (
    <div className="h-screen bg-muted">
      <Outlet />
    </div>
  );
}
