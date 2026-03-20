import { getOrders } from "@/lib/api/order/get-orders";
import { useQuery } from "@tanstack/react-query";

type OrdersPeriod = "daily" | "weekly" | "monthly";

type UseGetOrdersProps = {
  organizationId: string;
  period: OrdersPeriod;
  referenceDate: string;
  isPaid?: boolean;
};

export function useGetOrders({ organizationId, period, referenceDate, isPaid }: UseGetOrdersProps) {
  return useQuery({
    queryKey: ["orders", organizationId, period, referenceDate, isPaid],
    queryFn: async () => getOrders({ organizationId, period, referenceDate, isPaid }),
    enabled: !!organizationId,
  });
}
