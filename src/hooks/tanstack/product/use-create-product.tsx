import { createProduct } from "@/lib/api/product/create-product";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["products", variables.organizationId],
      });
    },
  });
}
