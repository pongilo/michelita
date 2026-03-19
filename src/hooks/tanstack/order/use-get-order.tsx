import { useQuery } from "@tanstack/react-query";
import { getOrder } from "@/lib/api/order/get-order";

type UseGetOrderProps = {
  organizationId: string;
  orderId: string;
};

export function useGetOrder({ organizationId, orderId }: UseGetOrderProps) {
  return useQuery({
    queryKey: ["order", organizationId, orderId],
    queryFn: async () =>
      getOrder({
        id: orderId,
        organizationId,
      }),
    enabled: !!organizationId && !!orderId,
  });
}
