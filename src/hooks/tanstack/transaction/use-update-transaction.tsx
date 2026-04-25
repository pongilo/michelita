import { updateTransaction } from "@/lib/api/transaction/update-transaction";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateTransactionProps = {
  organizationId: string;
};

export function useUpdateTransaction({ organizationId }: UseUpdateTransactionProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions", organizationId],
      });
    },
  });
}
