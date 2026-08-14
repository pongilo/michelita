import { updateProductCategory } from "@/lib/api/product-category/update-product-category";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateProductCategoryProps = {
  organizationId: string;
};

export function useUpdateProductCategory({ organizationId }: UseUpdateProductCategoryProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProductCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["product-categories", organizationId],
      });
    },
  });
}
