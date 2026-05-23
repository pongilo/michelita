import { createOrder } from "@/lib/api/order/create-order";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrder,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["orders", variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", variables.organizationId, "daily"],
      });
    },
  });
}
