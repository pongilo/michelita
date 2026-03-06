import { deleteCustomer } from "@/lib/api/customer/delete-customer";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseDeleteCustomerProps = {
  organizationId: string;
};

export function useDeleteCustomer({ organizationId }: UseDeleteCustomerProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customers", organizationId],
      });
    },
  });
}
