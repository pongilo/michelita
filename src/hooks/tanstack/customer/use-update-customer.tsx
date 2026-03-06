import { updateCustomer } from "@/lib/api/customer/update-customer";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateCustomerProps = {
  organizationId: string;
};

export function useUpdateCustomer({ organizationId }: UseUpdateCustomerProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customers", organizationId],
      });
    },
  });
}
