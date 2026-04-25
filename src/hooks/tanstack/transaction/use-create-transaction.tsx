import { createTransaction } from "@/lib/api/transaction/create-transaction";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["transactions", variables.organizationId],
      });
    },
  });
}
