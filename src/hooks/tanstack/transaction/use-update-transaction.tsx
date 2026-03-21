import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTransaction } from "@/lib/api/transaction/update-transaction";

type UseUpdateTransactionProps = {
  organizationId: string;
};

export function useUpdateTransaction({ organizationId }: UseUpdateTransactionProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTransaction,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["transactions", organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["customer", organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", organizationId, "daily"],
      });
      if (variables.linkedOrderId) {
        queryClient.invalidateQueries({
          queryKey: ["order", organizationId, variables.linkedOrderId],
        });
      }
    },
  });
}
