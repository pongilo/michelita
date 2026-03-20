import { getOrders } from "@/lib/api/order/get-orders";
import { useQuery } from "@tanstack/react-query";

type OrdersPeriod = "daily" | "weekly" | "monthly";

type UseGetOrdersProps = {
  organizationId: string;
  period: OrdersPeriod;
  referenceDate: string;
};

export function useGetOrders({ organizationId, period, referenceDate }: UseGetOrdersProps) {
  return useQuery({
    queryKey: ["orders", organizationId, period, referenceDate],
    queryFn: async () => getOrders({ organizationId, period, referenceDate }),
    enabled: !!organizationId,
  });
}
