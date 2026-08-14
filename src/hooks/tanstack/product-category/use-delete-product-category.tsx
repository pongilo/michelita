import { deleteProductCategory } from "@/lib/api/product-category/delete-product-category";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseDeleteProductCategoryProps = {
  organizationId: string;
};

export function useDeleteProductCategory({ organizationId }: UseDeleteProductCategoryProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProductCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["product-categories", organizationId],
      });
    },
  });
}
