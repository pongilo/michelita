import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTransaction } from "@/lib/api/transaction/delete-transaction";

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
      queryClient.invalidateQueries({
        queryKey: ["customer", organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", organizationId, "daily"],
      });
    },
  });
}
