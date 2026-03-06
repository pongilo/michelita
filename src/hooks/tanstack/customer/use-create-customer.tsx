import { createCustomer } from "@/lib/api/customer/create-customer";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["customers", variables.organizationId],
      });
    },
  });
}
