import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/lib/api/order/list-orders";

type UseListOrdersProps = {
  organizationId: string;
  period: "daily" | "weekly" | "monthly";
  referenceDate: string;
};

export function useListOrders({ organizationId, period, referenceDate }: UseListOrdersProps) {
  return useQuery({
    queryKey: ["orders", organizationId, period, referenceDate],
    queryFn: async () => listOrders({ organizationId, period, referenceDate }),
    enabled: !!organizationId,
    refetchInterval: 60_000,
  });
}
