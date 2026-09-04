import { bulkUpdateOrdersPaid } from "@/lib/api/order/bulk-update-orders-paid";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseBulkUpdateOrdersPaidProps = {
  organizationId: string;
};

export function useBulkUpdateOrdersPaid({ organizationId }: UseBulkUpdateOrdersPaidProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkUpdateOrdersPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["customer", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", organizationId, "daily"] });
    },
  });
}
