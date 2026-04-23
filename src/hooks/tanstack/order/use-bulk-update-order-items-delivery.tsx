import { bulkUpdateOrderItemsDelivery } from "@/lib/api/order/bulk-update-order-items-delivery";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseBulkUpdateOrderItemsDeliveryProps = {
  organizationId: string;
};

export function useBulkUpdateOrderItemsDelivery({ organizationId }: UseBulkUpdateOrderItemsDeliveryProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkUpdateOrderItemsDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", organizationId, "daily"] });
      queryClient.invalidateQueries({ queryKey: ["order", organizationId] });
    },
  });
}
