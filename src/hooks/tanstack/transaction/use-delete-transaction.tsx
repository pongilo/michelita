import { deleteTransaction } from "@/lib/api/transaction/delete-transaction";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseDeleteTransactionProps = {
  organizationId: string;
};

export function useDeleteTransaction({ organizationId }: UseDeleteTransactionProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions", organizationId],
      });
    },
  });
}
