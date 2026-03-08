import { deleteOrder } from "@/lib/api/order/delete-order";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseDeleteOrderProps = {
  organizationId: string;
};

export function useDeleteOrder({ organizationId }: UseDeleteOrderProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["orders", organizationId],
      });
    },
  });
}
