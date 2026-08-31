import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, organization, isLoading } = useAuth();
  const { location } = useRouterState();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Carregando...
      </div>
    )
  }

  // Usuário autenticado com organização → vai para o app
  if (user && organization) {
    return <Navigate to="/app" />;
  }

  // Usuário autenticado sem organização → precisa criar uma organização
  if (user && !organization) {
    if (location.pathname !== "/organization/new") {
      return <Navigate to="/organization/new" />;
    }
    return (
      <div className="h-screen bg-muted">
        <Outlet />
      </div>
    );
  }

  // Usuário não autenticado tentando acessar /organization/new → volta para login
  if (!user && location.pathname === "/organization/new") {
    return <Navigate to="/login" />;
  }

  // Usuário não autenticado → mostra login/register
  return (
    <div className="h-screen bg-muted">
      <Outlet />
    </div>
  );
}
