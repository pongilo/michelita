import { getOrders } from "@/lib/api/order/get-orders";
import { useQuery } from "@tanstack/react-query";

type UseGetOrdersProps = {
  organizationId: string;
};

export function useGetOrders({ organizationId }: UseGetOrdersProps) {
  return useQuery({
    queryKey: ["orders", organizationId],
    queryFn: async () => getOrders({ organizationId }),
    enabled: !!organizationId,
  });
}
