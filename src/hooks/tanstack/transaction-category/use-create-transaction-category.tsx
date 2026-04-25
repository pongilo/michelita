import { createTransactionCategory } from "@/lib/api/transaction-category/create-transaction-category";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateTransactionCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransactionCategory,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["transaction-categories", variables.organizationId],
      });
    },
  });
}
