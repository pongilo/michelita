import { deleteTransactionCategory } from "@/lib/api/transaction-category/delete-transaction-category";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseDeleteTransactionCategoryProps = {
  organizationId: string;
};

export function useDeleteTransactionCategory({ organizationId }: UseDeleteTransactionCategoryProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransactionCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transaction-categories", organizationId],
      });
    },
  });
}
