import { updateSupply } from "@/lib/api/supply/update-supply";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateSupplyProps = {
  organizationId: string;
};

export function useUpdateSupply({ organizationId }: UseUpdateSupplyProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["product-supplies"] });
    },
  });
}
