import { useQuery } from "@tanstack/react-query";
import { getOrdersOverview } from "@/lib/api/order/get-orders-overview";

type UseGetOrdersOverviewProps = {
  organizationId: string;
  startAt: Date
  endAt: Date
};

export function useGetOrdersOverview({ organizationId, startAt, endAt }: UseGetOrdersOverviewProps) {
  return useQuery({
    queryKey: ["orders-overview", organizationId, startAt, endAt],
    queryFn: async () => getOrdersOverview({ organizationId, startAt, endAt }),
    enabled: !!organizationId,
    refetchInterval: 60_000,
  });
}
