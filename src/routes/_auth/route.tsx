import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getOrganization } from "@/lib/api/organization/get-organization";
import { getSession } from "@/lib/api/auth/get-session";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location }) => {
    const { session } = await getSession();

    if (!session) {
      if (location.pathname === '/organization/new') {
        throw redirect({ to: "/login" });
      }
      return {
        userId: 'asdas'
      };
    }

    const organization = await getOrganization({ ownerId: session.user.id });

    if (organization) {
      throw redirect({ to: "/app/dashboard" });
    }

    if (location.pathname !== "/organization/new") {
      throw redirect({ to: "/organization/new" });
    }

    return {
      userId: session.user.id
    };
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="h-screen bg-base-200">
      <Outlet />
    </div>
  )
}
