import { updateCustomer } from "@/lib/api/customer/update-customer";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateCustomerProps = {
  organizationId: string;
};

export function useUpdateCustomer({ organizationId }: UseUpdateCustomerProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["customers", organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["customer", organizationId, variables.id],
      });
    },
  });
}
