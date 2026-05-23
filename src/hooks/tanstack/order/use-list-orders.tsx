import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/lib/api/order/list-orders";

type UseListOrdersProps = {
  organizationId: string;
  referenceDate: string;
};

export function useListOrders({ organizationId, referenceDate }: UseListOrdersProps) {
  return useQuery({
    queryKey: ["orders", organizationId, "daily", referenceDate],
    queryFn: async () => listOrders({ organizationId, referenceDate }),
    enabled: !!organizationId,
    refetchInterval: 60_000,
  });
}
