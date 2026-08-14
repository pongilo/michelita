import { createProductCategory } from "@/lib/api/product-category/create-product-category";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProductCategory,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["product-categories", variables.organizationId],
      });
    },
  });
}
