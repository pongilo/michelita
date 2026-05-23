import { updateOrderItems } from "@/lib/api/order/update-order-items";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateOrderItemsProps = {
  organizationId: string;
};

export function useUpdateOrderItems({ organizationId }: UseUpdateOrderItemsProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrderItems,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["order", organizationId, variables.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", organizationId, "daily"] });
    },
  });
}
