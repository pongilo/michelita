import { useQuery } from "@tanstack/react-query";
import { getDailyOrders } from "@/lib/api/order/get-daily-orders";

type UseGetDailyOrdersProps = {
  organizationId: string;
  referenceDate?: string;
};

export function useGetDailyOrders({ organizationId, referenceDate }: UseGetDailyOrdersProps) {
  return useQuery({
    queryKey: ["daily-orders", organizationId, referenceDate ?? ""],
    queryFn: async () =>
      getDailyOrders({
        organizationId,
        referenceDate,
      }),
    enabled: !!organizationId,
  });
}
