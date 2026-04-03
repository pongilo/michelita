import { markAllItemsDelivered } from "@/lib/api/order/mark-all-items-delivered";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseMarkAllItemsDeliveredProps = {
  organizationId: string;
};

export function useMarkAllItemsDelivered({ organizationId }: UseMarkAllItemsDeliveredProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllItemsDelivered,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", organizationId, "daily"] });
      queryClient.invalidateQueries({ queryKey: ["order", organizationId] });
    },
  });
}
