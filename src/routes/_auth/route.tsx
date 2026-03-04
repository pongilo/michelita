import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getOrganization } from "@/lib/api/organization/get-organization";
import { getSession } from "@/lib/api/auth/get-session";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location }) => {
    const { session } = await getSession()

    if (!session) {
      return;
    }

    const organization = await getOrganization({ userId: session.user.id });

    if (organization && location.pathname !== "/app/dashboard") {
      throw redirect({ to: "/app/dashboard" });
    }

    if (!organization && location.pathname !== "/organization/new") {
      throw redirect({ to: "/organization/new" });
    }
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
