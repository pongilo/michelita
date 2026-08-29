import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/lib/api/dashboard/get-dashboard-summary";

type UseGetDashboardSummaryProps = {
  organizationId: string;
  date: string;
  enabled?: boolean;
};

export function useGetDashboardSummary({ organizationId, date, enabled = true }: UseGetDashboardSummaryProps) {
  return useQuery({
    queryKey: ["dashboard", organizationId, "summary", date],
    queryFn: async () => getDashboardSummary({ organizationId, date }),
    enabled: enabled && !!organizationId && !!date,
  });
}
