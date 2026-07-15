import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/lib/api/order/list-orders";

type UseListOrdersProps = {
  organizationId: string;
  referenceDate: string;
  enabled?: boolean;
};

export function useListOrders({ organizationId, referenceDate, enabled = true }: UseListOrdersProps) {
  return useQuery({
    queryKey: ["orders", organizationId, "daily", referenceDate],
    queryFn: async () => listOrders({ organizationId, referenceDate }),
    enabled: enabled && !!organizationId && !!referenceDate,
    refetchInterval: 60_000,
  });
}
