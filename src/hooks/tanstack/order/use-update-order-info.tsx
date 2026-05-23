import { updateOrderInfo } from "@/lib/api/order/update-order-info";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateOrderInfoProps = {
  organizationId: string;
};

export function useUpdateOrderInfo({ organizationId }: UseUpdateOrderInfoProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrderInfo,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["order", organizationId, variables.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", organizationId, "daily"] });
    },
  });
}
