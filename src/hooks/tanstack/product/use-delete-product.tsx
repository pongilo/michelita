import { deleteProduct } from "@/lib/api/product/delete-product";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseDeleteProductProps = {
  organizationId: string;
};

export function useDeleteProduct({ organizationId }: UseDeleteProductProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["products", organizationId],
      });
    },
  });
}
