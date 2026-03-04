import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getUser } from "@/lib/api/auth/get-user";
import { getOrganization } from "@/lib/api/organization/get-organization";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const { data: userData } = await getUser();

    if (userData.user?.id) {
      const organization = await getOrganization({ userId: userData.user.id });
      const to = organization ? "/app/dashboard" : "/organization/new";
      throw redirect({ to });
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
