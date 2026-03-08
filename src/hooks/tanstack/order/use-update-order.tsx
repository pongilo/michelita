import { updateOrder } from "@/lib/api/order/update-order";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateOrderProps = {
  organizationId: string;
};

export function useUpdateOrder({ organizationId }: UseUpdateOrderProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["orders", organizationId],
      });
    },
  });
}
