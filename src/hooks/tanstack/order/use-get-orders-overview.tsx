import { useQuery } from "@tanstack/react-query";
import { getOrdersOverview } from "@/lib/api/order/get-orders-overview";

type UseGetOrdersOverviewProps = {
  organizationId: string;
  period: "weekly" | "monthly";
  referenceDate: string;
};

export function useGetOrdersOverview({ organizationId, period, referenceDate }: UseGetOrdersOverviewProps) {
  return useQuery({
    queryKey: ["orders-overview", organizationId, period, referenceDate],
    queryFn: async () => getOrdersOverview({ organizationId, period, referenceDate }),
    enabled: !!organizationId,
    refetchInterval: 60_000,
  });
}
