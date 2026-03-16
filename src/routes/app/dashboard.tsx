import { createFileRoute, redirect } from "@tanstack/react-router";
import { getUser } from "@/lib/api/auth/get-user";
import { getOrganization } from "@/lib/api/organization/get-organization";

export const Route = createFileRoute("/app/dashboard")({
  beforeLoad: async () => {
    const { user } = await getUser();

    if (!user?.id) {
      throw redirect({ to: "/login" });
    }

    const organization = await getOrganization();

    if (!organization) {
      throw redirect({ to: "/organization/new" });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
    </div>
  );
}
