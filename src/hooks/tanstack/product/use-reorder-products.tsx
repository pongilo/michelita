import { reorderProducts } from "@/lib/api/product/reorder-products";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseReorderProductsProps = {
  organizationId: string;
};

export function useReorderProducts({ organizationId }: UseReorderProductsProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["products", organizationId],
      });
    },
  });
}
