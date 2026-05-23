import { updateTransactionCategory } from "@/lib/api/transaction-category/update-transaction-category";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateTransactionCategoryProps = {
  organizationId: string;
};

export function useUpdateTransactionCategory({ organizationId }: UseUpdateTransactionCategoryProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTransactionCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transaction-categories", organizationId],
      });
    },
  });
}
