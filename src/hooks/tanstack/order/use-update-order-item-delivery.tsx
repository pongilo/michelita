import { updateOrderItemDelivery } from "@/lib/api/order/update-order-item-delivery";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateOrderItemDeliveryProps = {
  organizationId: string;
};

export function useUpdateOrderItemDelivery({ organizationId }: UseUpdateOrderItemDeliveryProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrderItemDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dashboard", organizationId, "daily"],
      });
    },
  });
}
