import { updateOrderItem } from "@/lib/api/order/update-order-item";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateOrderItemProps = {
  organizationId: string;
  orderId: string;
};

export function useUpdateOrderItem({ organizationId, orderId }: UseUpdateOrderItemProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrderItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", organizationId, orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", organizationId, "daily"] });
    },
  });
}
