import { createSupply } from "@/lib/api/supply/create-supply";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateSupply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSupply,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["supplies", variables.organizationId],
      });
    },
  });
}
