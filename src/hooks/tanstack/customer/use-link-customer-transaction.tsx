import { useMutation, useQueryClient } from "@tanstack/react-query";
import { linkCustomerTransaction } from "@/lib/api/customer/link-customer-transaction";

type Props = {
  organizationId: string;
  customerId: string;
};

export function useLinkCustomerTransaction({ organizationId, customerId }: Props) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: linkCustomerTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", organizationId, customerId] });
      queryClient.invalidateQueries({ queryKey: ["transactions", organizationId] });
    },
  });
}
