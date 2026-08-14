import { reorderProductCategories } from "@/lib/api/product-category/reorder-product-categories";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseReorderProductCategoriesProps = {
  organizationId: string;
};

export function useReorderProductCategories({ organizationId }: UseReorderProductCategoriesProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderProductCategories,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["product-categories", organizationId],
      });
    },
  });
}
