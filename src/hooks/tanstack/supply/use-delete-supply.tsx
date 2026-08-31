import { deleteSupply } from "@/lib/api/supply/delete-supply";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseDeleteSupplyProps = {
  organizationId: string;
};

export function useDeleteSupply({ organizationId }: UseDeleteSupplyProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["product-supplies"] });
    },
  });
}
