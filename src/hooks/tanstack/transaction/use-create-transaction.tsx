import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTransaction } from "@/lib/api/transaction/create-transaction";

type UseCreateTransactionProps = {
  organizationId: string;
};

export function useCreateTransaction({ organizationId }: UseCreateTransactionProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
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
