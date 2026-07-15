import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/lib/api/order/list-orders";

type UseListOrdersProps = {
  organizationId: string;
  startDate: string;
  endDate: string;
  enabled?: boolean;
};

export function useListOrders({ organizationId, startDate, endDate, enabled = true }: UseListOrdersProps) {
  return useQuery({
    queryKey: ["orders", organizationId, "range", startDate, endDate],
    queryFn: async () => listOrders({ organizationId, startDate, endDate }),
    enabled: enabled && !!organizationId && !!startDate && !!endDate,
    refetchInterval: 60_000,
  });
}
