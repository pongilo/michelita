import { useMutation, useQueryClient } from "@tanstack/react-query";
import { linkOrderTransaction, unlinkOrderTransaction } from "@/lib/api/order/link-order-transaction";

type Props = {
  organizationId: string;
  orderId: string;
};

export function useLinkOrderTransaction({ organizationId, orderId }: Props) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["order", organizationId, orderId] });
    queryClient.invalidateQueries({ queryKey: ["transactions", organizationId] });
    queryClient.invalidateQueries({ queryKey: ["customer", organizationId] });
  };

  const link = useMutation({
    mutationFn: linkOrderTransaction,
    onSuccess: invalidate,
  });

  const unlink = useMutation({
    mutationFn: unlinkOrderTransaction,
    onSuccess: invalidate,
  });

  return { link, unlink };
}
