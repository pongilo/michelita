import { toggleProductActive } from "@/lib/api/product/toggle-product-active";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseToggleProductActiveProps = {
  organizationId: string;
};

export function useToggleProductActive({ organizationId }: UseToggleProductActiveProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleProductActive,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["products", organizationId],
      });
    },
  });
}
